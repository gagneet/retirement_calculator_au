from playwright.sync_api import sync_playwright, expect
import re

def run_verification(page):
    """
    Verifies that the new Age Pension inputs affect the calculation.
    This version adds console logging to capture silent runtime errors.
    """
    # --- Listen for console messages ---
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: [{msg.type}] {msg.text}"))

    print("Navigating to the application...")
    page.goto("http://localhost:8000", timeout=60000)

    # --- Arrange: Set new pension-related inputs ---
    print("Setting pension inputs...")
    page.locator("#homeOwnershipStatus").select_option("non_owner")
    page.locator("#rentAmount").fill("550")
    page.locator("#partTimeWorkIncome").fill("15000")

    # --- Act: Trigger the calculation ---
    print("Running calculation...")
    calculate_button = page.locator("#btnCalculate")
    expect(calculate_button).to_be_enabled(timeout=10000)
    calculate_button.click()

    # --- Assert: Wait for calculation to finish and results to display ---
    print("Waiting for calculation to complete by checking for result data...")

    final_result_div = page.locator("#finalResult")
    # This is expected to fail if there's a runtime error, but the console logs will provide the clue.
    expect(final_result_div).to_contain_text("Final Balance", timeout=30000)
    print("Calculation data is present in the DOM.")

    # The rest of the script will only run if the above expectation passes.
    print("Clicking summary tab to view results...")
    summary_tab_button = page.locator('button[onclick="showTab(\'summary\')"]')
    summary_tab_button.click()

    summary_tab_content = page.locator("#summary-tab")
    expect(summary_tab_content).to_have_class(re.compile(r'\bactive\b'), timeout=5000)

    summary_results = summary_tab_content.locator("#summaryResults")
    expect(summary_results).to_be_visible(timeout=5000)
    print("Results are visible on the page.")

    screenshot_path = "jules-scratch/verification/verification.png"
    summary_tab_content.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
            print("Verification script completed successfully!")
        except Exception as e:
            print(f"An error occurred during verification: {e}")
            page.screenshot(path="jules-scratch/verification/error_screenshot.png")
            print("Error screenshot saved.")
        finally:
            browser.close()

if __name__ == "__main__":
    main()