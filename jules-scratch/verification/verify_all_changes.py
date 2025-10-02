from playwright.sync_api import sync_playwright, expect
import json

def verify_all_changes(page):
    """
    Verifies SEO enhancements, build corrections, and analytics integration.
    - Checks for updated title tag on the main page.
    - Verifies the enhanced ld+json structured data.
    - Navigates to a static page to ensure it's included in the build.
    - Clicks a button to trigger an analytics event.
    - Takes a screenshot for final visual verification.
    """
    # 1. Verify main page SEO
    page.goto("http://localhost:8000")
    expect(page).to_have_title("Australian Retirement Calculator | Free Super, Pension & Tax Planning Tool")

    # 2. Verify Structured Data
    structured_data_element = page.locator('script[type="application/ld+json"]')
    expect(structured_data_element).to_be_attached()
    structured_data_content = structured_data_element.inner_text()
    structured_data = json.loads(structured_data_content)
    assert structured_data.get("softwareVersion") == "1.0.0", "softwareVersion is not correct in ld+json"
    assert "AI-Powered Recommendations" in structured_data.get("featureList"), "Feature list is not updated in ld+json"

    # 3. Verify a static page is served correctly
    page.goto("http://localhost:8000/assumptions.html")
    expect(page).to_have_title("Assumptions | Australian Retirement Calculator")

    # Go back to the main page to trigger analytics
    page.goto("http://localhost:8000")

    # 4. Trigger an analytics event
    # Accept the disclaimer first
    page.locator("#accept-disclaimer").click()

    # Click the "New User" button to trigger the onboarding event
    page.locator("#new-user-btn").click()

    # 5. Take a screenshot for visual verification
    # Wait for the avatar selection screen to be visible
    expect(page.locator("#avatar-selection")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_all_changes(page)
        browser.close()