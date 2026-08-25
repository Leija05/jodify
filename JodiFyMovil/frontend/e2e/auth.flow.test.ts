import { device, element, by, expect } from 'detox';

describe('Auth Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen on first launch', async () => {
    await expect(element(by.id('auth-screen'))).toBeVisible();
    await expect(element(by.text('Iniciar sesión'))).toBeVisible();
  });

  it('should login with demo account', async () => {
    await element(by.id('demo-account-user')).tap();
    await expect(element(by.id('username-input'))).toHaveText('user');
    await expect(element(by.id('password-input'))).toHaveText('user123');
    
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('username-input')).typeText('invalid');
    await element(by.id('password-input')).typeText('invalid');
    await element(by.id('login-button')).tap();
    
    await expect(element(by.text('No se pudo iniciar sesión'))).toBeVisible();
  });
});

describe('Navigation', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await element(by.id('demo-account-user')).tap();
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(5000);
  });

  it('should navigate to library tab', async () => {
    await element(by.id('tab-library')).tap();
    await expect(element(by.id('library-screen'))).toBeVisible();
  });

  it('should navigate to community tab', async () => {
    await element(by.id('tab-community')).tap();
    await expect(element(by.id('community-screen'))).toBeVisible();
  });

  it('should navigate to settings tab', async () => {
    await element(by.id('tab-settings')).tap();
    await expect(element(by.id('settings-screen'))).toBeVisible();
  });
});