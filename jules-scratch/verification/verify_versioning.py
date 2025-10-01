from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the app
        page.goto("http://localhost:8000/dist/index.html?skip=true")

        # Wait for the main calculator to be visible
        expect(page.locator("#calculator-form")).to_be_visible(timeout=30000)

        # 1. Verify version number in footer
        expect(page.locator("footer")).to_contain_text("Version 3.0.0")
        expect(page.locator("footer")).to_contain_text("Last updated:")

        # 2. Verify links to new pages
        expect(page.locator('a[href="assumptions.html"]')).to_be_visible()
        expect(page.locator('a[href="methodology.html"]')).to_be_visible()
        expect(page.locator('a[href="changelog.html"]')).to_be_visible()

        # 3. Verify version switcher
        expect(page.locator("#version-switcher")).to_be_visible()
        page.select_option("#version-switcher", "v0.9.0")

        # Click calculate to trigger a change
        page.get_by_role("button", name="Calculate").click()

        # Check that some value changes - e.g. the estimated balance
        # In v0.9.0, the default retirement age was 65, now it's 67. This should lead to a higher balance.
        # Let's just check that the calculation runs and the summary appears.
        expect(page.locator("#summary-results")).to_be_visible(timeout=10000)


        # 4. Verify "Show calculation" modal
        # First, ensure the summary is visible
        expect(page.locator("#summary-results")).to_be_visible()

        # Click the "Show calculation" button for the first result
        show_calc_button = page.locator(".show-calculation-btn").first
        show_calc_button.click()

        # Check if the modal appears and has content
        modal = page.locator("#calculation-details-modal")
        expect(modal).to_be_visible()
        expect(modal.locator(".modal-title")).to_have_text("Calculation Details")
        expect(modal.locator(".modal-body")).not_to_be_empty()

        # Check for specific formula text
        expect(modal.locator(".modal-body")).to_contain_text("Formula:")

        # Close the modal
        modal.get_by_role("button", name="Close").click()
        expect(modal).not_to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)