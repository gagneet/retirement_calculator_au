from playwright.sync_api import sync_playwright, expect
import json

def verify_seo_and_analytics(page):
    """
    Verifies SEO and Analytics enhancements.
    - Checks for updated title tag.
    - Verifies ld+json structured data.
    - Clicks a button to trigger an analytics event.
    - Takes a screenshot for visual verification.
    """
    # Navigate to the application
    page.goto("http://localhost:8000")

    # 1. Verify SEO Title
    expect(page).to_have_title("Australian Retirement Calculator | Free Super, Pension & Tax Planning Tool")

    # 2. Verify Structured Data
    structured_data_element = page.locator('script[type="application/ld+json"]')
    # The script tag is not visible, so we check if it's attached to the DOM
    expect(structured_data_element).to_be_attached()
    structured_data_content = structured_data_element.inner_text()
    structured_data = json.loads(structured_data_content)
    assert structured_data.get("softwareVersion") == "1.0.0", "softwareVersion is not correct in ld+json"
    assert "AI-Powered Recommendations" in structured_data.get("featureList"), "Feature list is not updated in ld+json"

    # 3. Trigger an analytics event (by clicking a button)
    # Accept the disclaimer first
    page.locator("#accept-disclaimer").click()

    # Click the "New User" button to trigger the onboarding event
    page.locator("#new-user-btn").click()

    # 4. Take a screenshot for visual verification
    page.screenshot(path="jules-scratch/verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_seo_and_analytics(page)
        browser.close()