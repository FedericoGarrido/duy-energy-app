/*
 * DUY Energy configuration
 *
 * Replace the placeholder values with your actual Shelly cloud credentials. The
 * device_id and auth_key can be found in the Shelly mobile app under
 * Settings → Device → Device information → Clave de autorización en la nube.
 */

const SHELLY_CONFIG = {
  /**
   * Server address for Shelly Cloud. This usually follows the pattern
   * https://shelly-XX-eu.shelly.cloud or .us depending on your region. Use the
   * server shown in your Shelly app under “Clave de autorización en la nube”.
   */
server: "http://192.168.1.2",
  /**
   * Device ID of your Shelly device. This is shown as "ID del dispositivo"
   * in the Shelly app. Do not include any extra spaces.
   */
  device_id: "d9ab8f",
  /**
   * Cloud authorization key for your device. Replace the placeholder below
   * with the long string shown in the Shelly app. KEEP THIS KEY PRIVATE.
   */
    auth_key: ""
};
