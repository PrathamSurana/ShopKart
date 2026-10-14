"""Browser E2E (Playwright). See README 'Automated checks'. Razorpay Checkout is SIMULATED by a stand-in script.
Run after starting: FerretDB/MongoDB, `node backend/tests/helpers/e2e-server.js` (with MONGODB_URI), and `npm run dev` in frontend."""
import os, sys, json
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
from playwright.sync_api import sync_playwright, expect

FAKE = """
window.Razorpay = function(o){ this.o=o; this.h={}; };
window.Razorpay.prototype.on = function(e,f){ this.h[e]=f; };
window.Razorpay.prototype.open = async function(){
  const mode = window.__RZP_MODE || 'success';
  if (mode==='fail'){ this.h['payment.failed']({error:{description:'Card declined'}}); return; }
  if (mode==='cancel'){ this.o.modal.ondismiss(); return; }
  const pay = 'pay_'+this.o.order_id+'_'+Date.now();
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode('e2e_test_secret'), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const bad = mode==='badsig';
  const sig = bad ? 'deadbeef' : Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(this.o.order_id+'|'+pay)))).map(b=>b.toString(16).padStart(2,'0')).join('');
  this.o.handler({razorpay_order_id:this.o.order_id, razorpay_payment_id:pay, razorpay_signature:sig});
};
"""
results=[]
def step(name, fn):
    try: fn(); results.append((name,"PASS"))
    except Exception as e: results.append((name,"FAIL: "+str(e).splitlines()[0][:200])); raise

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1200,"height":900})
    page = ctx.new_page()
    page.route("https://checkout.razorpay.com/v1/checkout.js", lambda r: r.fulfill(content_type="application/javascript", body=FAKE))
    # placehold.co is not reachable here; stub images so the UI doesn't wait on the network
    page.route("https://placehold.co/**", lambda r: r.fulfill(status=200, content_type="image/svg+xml", body="<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>"))
    page.set_default_timeout(6000); expect.set_options(timeout=6000)
    errs=[]; page.on("pageerror", lambda e: errs.append(str(e)))
    B="http://localhost:5173"
    try:
        def s1():
            page.goto(B+"/home"); expect(page).to_have_url(B+"/login")
        step("unauthenticated /home redirects to /login", s1)

        def s2():
            page.goto(B+"/register")
            page.click("button[type=submit]")
            expect(page.get_by_text("Full name is required.")).to_be_visible()
            page.fill("#fullName","Aarav Sharma"); page.fill("#email","aarav@example.com"); page.fill("#password","123"); page.fill("#phone","9876543210")
            page.click("button[type=submit]"); expect(page.get_by_text("at least 6 characters")).to_be_visible()
            page.fill("#password","secret123"); page.click("button[type=submit]")
            expect(page).to_have_url(B+"/login")
        step("register: validation errors then redirect to login", s2)

        def s3():
            page.fill("#email","aarav@example.com"); page.fill("#password","wrongpass"); page.click("button[type=submit]")
            expect(page.get_by_text("Invalid Credentials")).to_be_visible()
            page.fill("#password","secret123"); page.click("button[type=submit]")
            expect(page).to_have_url(B+"/home"); expect(page.get_by_text("Welcome, Aarav Sharma")).to_be_visible()
            expect(page.get_by_text("aarav@example.com").first).to_be_visible()
        step("login: invalid credentials message, then success -> /home with profile", s3)

        def s4():
            page.reload(); expect(page.get_by_text("Welcome, Aarav Sharma")).to_be_visible()
        step("session survives refresh (cookie + /customers/me)", s4)

        def s5():
            page.click("nav >> text=Products")
            expect(page.locator(".product-card")).to_have_count(18)
            page.fill("#search","keyboard"); expect(page.locator(".product-card")).to_have_count(1)
            page.fill("#search",""); page.select_option("#category","Books"); expect(page.locator(".product-card")).to_have_count(4)
            page.fill("#search","zzzzzz"); expect(page.get_by_text("No products found.")).to_be_visible()
            page.fill("#search",""); page.select_option("#category",""); page.select_option("#sort","price_asc")
            expect(page.locator(".product-card .price").first).to_have_text("₹499")
        step("products: list, search, category filter, empty state, sort", s5)

        def s6():
            card = page.locator(".product-card", has_text="Mechanical Keyboard")
            card.get_by_role("button", name="Add to Wishlist").click()
            expect(card.get_by_role("button", name="Added to Wishlist")).to_be_visible()
            page.click("nav >> text=Wishlist"); expect(page.locator(".product-card")).to_have_count(1)
            page.reload(); expect(page.locator(".product-card")).to_have_count(1)
            page.get_by_role("button", name="Remove ♥").click()
            expect(page.get_by_text("Your wishlist is empty")).to_be_visible()
        step("wishlist: add, persists on refresh, remove, empty state", s6)

        def s7():
            page.click("nav >> text=Products")
            page.locator(".product-card", has_text="Mechanical Keyboard").get_by_role("button", name="Add to Cart").click()
            expect(page.locator("nav .count")).to_have_text("(1)")
            page.locator(".product-card", has_text="Wireless Gaming Mouse").get_by_role("button", name="Add to Cart").click()
            expect(page.locator("nav .count")).to_have_text("(2)")
            page.click("nav >> text=Cart")
            expect(page.locator(".cart-item")).to_have_count(2)
            row = page.locator(".cart-item", has_text="Mechanical Keyboard")
            row.get_by_label("Increase quantity").click(); expect(page.locator("nav .count")).to_have_text("(3)")
            expect(page.locator(".summary-row.total")).to_contain_text("₹7,497")
            page.reload(); expect(page.locator("nav .count")).to_have_text("(3)")
        step("cart: add, navbar count sync, quantity, subtotal 7,497, persists on refresh", s7)

        def s8():
            page.get_by_role("button", name="Proceed to Checkout").click(); expect(page).to_have_url(B+"/checkout")
            calls=[]; page.on("request", lambda r: calls.append(r.url) if "create-payment-order" in r.url else None)
            page.fill("#fullName","   "); page.fill("#pincode","5600")
            page.get_by_role("button", name="Place Order").click()
            expect(page.get_by_text("Full name is required.")).to_be_visible()
            expect(page.get_by_text("Pincode must contain 6 digits.")).to_be_visible()
            assert calls==[], "backend was called despite invalid form"
        step("checkout: whitespace/pincode validation, backend NOT called", s8)

        def fill():
            page.fill("#fullName","Aarav Sharma"); page.fill("#phone","9876543210"); page.fill("#addressLine1","22 MG Road")
            page.fill("#city","Bengaluru"); page.fill("#state","Karnataka"); page.fill("#pincode","560001")
        def s9():
            fill(); page.evaluate("window.__RZP_MODE='fail'")
            page.get_by_role("button", name="Place Order").click()
            expect(page.get_by_text("Card declined")).to_be_visible()
            expect(page.locator("nav .count")).to_have_text("(3)")
            page.evaluate("window.__RZP_MODE='cancel'")
        step("payment failed: message shown, cart kept", s9)

        def s10b():
            page.evaluate("window.__RZP_MODE='cancel'")
            page.reload(); fill(); page.evaluate("window.__RZP_MODE='cancel'")
            page.get_by_role("button", name="Place Order").click()
            expect(page.get_by_text("Payment cancelled")).to_be_visible()
            expect(page.locator("nav .count")).to_have_text("(3)")
        step("payment cancelled: message shown, cart kept, can retry", s10b)

        def s11():
            page.evaluate("window.__RZP_MODE='badsig'")
            page.get_by_role("button", name="Place Order").click()
            expect(page.get_by_text("Invalid payment signature")).to_be_visible()
            expect(page.locator("nav .count")).to_have_text("(3)")
        step("forged signature: rejected by server, cart kept", s11)

        def s12():
            page.evaluate("window.__RZP_MODE='success'")
            page.get_by_role("button", name="Place Order").click()
            expect(page).to_have_url(__import__("re").compile(r".*/order-success/[0-9a-f]{24}"))
            expect(page.get_by_text("Order Placed Successfully")).to_be_visible()
            expect(page.locator("nav .count")).to_have_text("(0)")
            expect(page.get_by_text("₹7,497").first).to_be_visible()
            expect(page.get_by_text("Placed", exact=True).first).to_be_visible()
        step("valid payment: success page, Cart (0), PAID/PLACED", s12)

        def s13():
            page.get_by_role("link", name="View My Orders").click()
            expect(page.locator(".order-card")).to_have_count(1)
            page.get_by_role("link", name="View Details").click()
            expect(page.get_by_text("Mechanical Keyboard")).to_be_visible(); expect(page.get_by_text("22 MG Road")).to_be_visible()
            page.goto(B+"/checkout"); expect(page.get_by_text("Your cart is empty")).to_be_visible()
        step("orders list + details; /checkout with empty cart shows empty state", s13)

        def s14():
            page.goto(B+"/products"); assert page.locator(".product-card", has_text="Designing Data").get_by_role("button", name="Out of Stock").is_disabled()
            page.goto(B+"/products/not-an-id"); expect(page.get_by_text("Product not found.")).to_be_visible()
            page.click("nav >> text=Logout"); expect(page).to_have_url(B+"/login")
            page.goto(B+"/cart"); expect(page).to_have_url(B+"/login")
        step("out-of-stock disabled, bad product id, logout redirects & protects routes", s14)

        def s15():
            page.set_viewport_size({"width":375,"height":800}); page.goto(B+"/login")
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "horizontal overflow on mobile"
        step("mobile viewport: no horizontal overflow on login", s15)
    finally:
        print(json.dumps(results, indent=1)); print("page errors:", errs)
        b.close()
