import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('dist/index.html')

        # Go to the local HTML file and wait for the DOM to be loaded
        await page.goto(f'file://{file_path}', wait_until='domcontentloaded')

        # Take a screenshot of the initial page to see what's rendering
        await page.screenshot(path='jules-scratch/verification/initial_load.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())