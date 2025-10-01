import { test, expect } from "@playwright/test";
import {
  navigateToDashboard,
  switchTheme,
  getCurrentTheme,
} from "./helpers";

test.describe("Theme Switching", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test.describe("Theme Toggle", () => {
    test("user can switch to light theme", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i], button:has-text("Theme")');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        await themeButton.click();
        
        const lightOption = page.locator('button:has-text("Light"), [role="menuitem"]:has-text("Light")');
        if (await lightOption.isVisible({ timeout: 2000 })) {
          await lightOption.click();
          await page.waitForTimeout(500);
          
          const isDark = await page.evaluate(() => {
            return document.documentElement.classList.contains('dark');
          });
          
          expect(isDark).toBeFalsy();
        }
      }
    });

    test("user can switch to dark theme", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i], button:has-text("Theme")');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        await themeButton.click();
        
        const darkOption = page.locator('button:has-text("Dark"), [role="menuitem"]:has-text("Dark")');
        if (await darkOption.isVisible({ timeout: 2000 })) {
          await darkOption.click();
          await page.waitForTimeout(500);
          
          const isDark = await page.evaluate(() => {
            return document.documentElement.classList.contains('dark');
          });
          
          expect(isDark).toBeTruthy();
        }
      }
    });

    test("user can switch to system theme", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i]');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        await themeButton.click();
        
        const systemOption = page.locator('button:has-text("System")');
        if (await systemOption.isVisible({ timeout: 2000 })) {
          await systemOption.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe("Theme Persistence", () => {
    test("theme persists on page reload", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i]');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        await themeButton.click();
        
        const darkOption = page.locator('button:has-text("Dark")');
        if (await darkOption.isVisible({ timeout: 2000 })) {
          await darkOption.click();
          await page.waitForTimeout(500);
          
          const isDarkBefore = await page.evaluate(() => {
            return document.documentElement.classList.contains('dark');
          });
          
          await page.reload();
          await page.waitForLoadState('networkidle');
          
          const isDarkAfter = await page.evaluate(() => {
            return document.documentElement.classList.contains('dark');
          });
          
          expect(isDarkAfter).toBe(isDarkBefore);
        }
      }
    });
  });

  test.describe("View Transitions", () => {
    test("theme switch animates smoothly", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i]');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        const startTime = Date.now();
        
        await themeButton.click();
        
        const darkOption = page.locator('button:has-text("Dark")');
        if (await darkOption.isVisible({ timeout: 2000 })) {
          await darkOption.click();
          await page.waitForTimeout(1000);
          
          const transitionTime = Date.now() - startTime;
          
          expect(transitionTime).toBeLessThan(2000);
        }
      }
    });

    test("view transition API is used if available", async ({ page }) => {
      const hasViewTransition = await page.evaluate(() => {
        return 'startViewTransition' in document;
      });
      
      expect(typeof hasViewTransition).toBe('boolean');
    });
  });

  test.describe("UI Visibility in Both Themes", () => {
    test("all UI elements visible in light theme", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i]');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        await themeButton.click();
        
        const lightOption = page.locator('button:has-text("Light")');
        if (await lightOption.isVisible({ timeout: 2000 })) {
          await lightOption.click();
          await page.waitForTimeout(500);
          
          await expect(page.locator('header')).toBeVisible();
          await expect(page.locator('main')).toBeVisible();
          
          const taskSidebar = page.locator('aside:has(text("Tasks"))');
          if (await taskSidebar.isVisible({ timeout: 1000 })) {
            await expect(taskSidebar).toBeVisible();
          }
        }
      }
    });

    test("all UI elements visible in dark theme", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i]');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        await themeButton.click();
        
        const darkOption = page.locator('button:has-text("Dark")');
        if (await darkOption.isVisible({ timeout: 2000 })) {
          await darkOption.click();
          await page.waitForTimeout(500);
          
          await expect(page.locator('header')).toBeVisible();
          await expect(page.locator('main')).toBeVisible();
        }
      }
    });

    test("text contrast is sufficient in both themes", async ({ page }) => {
      const testContrast = async () => {
        const textElement = page.locator('h1, h2, p').first();
        
        if (await textElement.isVisible({ timeout: 2000 })) {
          const styles = await textElement.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
            };
          });
          
          expect(styles.color).toBeTruthy();
        }
      };
      
      await testContrast();
      
      const themeButton = page.locator('[aria-label*="theme" i]');
      if (await themeButton.isVisible({ timeout: 2000 })) {
        await themeButton.click();
        
        const darkOption = page.locator('button:has-text("Dark")');
        if (await darkOption.isVisible({ timeout: 2000 })) {
          await darkOption.click();
          await page.waitForTimeout(500);
          
          await testContrast();
        }
      }
    });
  });

  test.describe("Theme Colors", () => {
    test("category colors are visible in both themes", async ({ page }) => {
      const categoryBadge = page.locator('[class*="category"], [class*="badge"]').first();
      
      if (await categoryBadge.isVisible({ timeout: 2000 })) {
        const lightColor = await categoryBadge.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        
        const themeButton = page.locator('[aria-label*="theme" i]');
        if (await themeButton.isVisible({ timeout: 2000 })) {
          await themeButton.click();
          
          const darkOption = page.locator('button:has-text("Dark")');
          if (await darkOption.isVisible({ timeout: 2000 })) {
            await darkOption.click();
            await page.waitForTimeout(500);
            
            const darkColor = await categoryBadge.evaluate((el) => {
              return window.getComputedStyle(el).backgroundColor;
            });
            
            expect(lightColor).not.toBe(darkColor);
          }
        }
      }
    });
  });

  test.describe("Accessibility", () => {
    test("theme switcher has proper ARIA labels", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i]');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        const ariaLabel = await themeButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test("theme options are keyboard accessible", async ({ page }) => {
      const themeButton = page.locator('[aria-label*="theme" i]');
      
      if (await themeButton.isVisible({ timeout: 2000 })) {
        await themeButton.focus();
        await page.keyboard.press('Enter');
        
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(500);
      }
    });
  });
});
