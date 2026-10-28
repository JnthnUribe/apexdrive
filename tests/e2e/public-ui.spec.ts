import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home imagery, FAQ and layout", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tu próximo auto.Tu próxima historia.",
  );
  await expect(page.locator(".hero-photo img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-photo img")
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.locator("summary").filter({ hasText: "¿Puedo comparar mis opciones?" }).click();
  await expect(page.getByText("Sí. Desde la ficha de cada auto", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Load below-the-fold images through real scrolling before visual capture.
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `docs/screenshots/home-${testInfo.project.name}.png`,
    fullPage: true,
    scale: "css",
  });
  expect(errors).toEqual([]);
});

test("search submits nonempty filters and catalog retains them", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("¿Qué auto buscas?").fill("Mazda");
  await page.getByLabel("Tu presupuesto").selectOption("500000");
  await page.getByRole("button", { name: "Buscar autos" }).click();
  await expect(page).toHaveURL(/\/cars\?q=Mazda&maxPrice=500000$/);
  await expect(page.getByLabel("Buscar por texto")).toHaveValue("Mazda");
  await expect(page.getByLabel("Precio máx.", { exact: true })).toHaveValue("500000");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Catálogo no disponible");
});

test("empty search and category links preserve valid catalog URLs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Buscar autos" }).click();
  await expect(page).toHaveURL(/\/cars$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Eléctricos", exact: true }).click();
  await expect(page).toHaveURL(/\/cars\?fuel=ELECTRIC$/);
  await expect(page.getByRole("combobox", { name: "Combustible", exact: true })).toHaveValue(
    "ELECTRIC",
  );
  await page.getByRole("link", { name: "Limpiar filtros", exact: true }).click();
  await expect(page).toHaveURL(/\/cars$/);
});

test("mobile menu closes with Escape and restores focus", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation only");
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("navigation", { name: "Navegación móvil" })
    .getByRole("link", { name: "Cómo funciona" })
    .click();
  await expect(page).toHaveURL(/\/como-funciona$/);
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeHidden();
});

for (const path of ["/", "/cars", "/login", "/register", "/compare", "/como-funciona"]) {
  test(`accessible public surface ${path}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (path === "/login" || path === "/cars")
      await page.screenshot({
        path: `docs/screenshots/${path.slice(1)}-${testInfo.project.name}.png`,
        fullPage: true,
      });
  });
}

test("private pages redirect unauthenticated visitors", async ({ page }) => {
  for (const path of ["/dashboard", "/sell", "/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  }
});

test("narrow 320px layout stays within viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Narrow mobile check only");
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/", "/cars", "/login", "/compare"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
});
