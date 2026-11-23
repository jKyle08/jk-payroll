// ==============================================================================
// PAYPULSE ENTERPRISE TOAST SYSTEM: STRING INTERPOLATION ENGINE
// Handles {{placeholder}} dynamic templating safely and reliably
// File: src/client/components/ui/toast/toast-interpolate.ts
// ==============================================================================

/**
 * Replaces {{placeholder}} tokens within a template string with matching values
 * from the provided params dictionary.
 *
 * Example:
 *   interpolate("Employee {{name}} assigned to {{dept}}.", { name: "Sarah", dept: "HR" })
 *   // => "Employee Sarah assigned to HR."
 */
export function interpolate(
  template: string,
  params?: Record<string, any>
): string {
  if (!template || !params || Object.keys(params).length === 0) {
    return template;
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const val = params[key];
      if (val === null || val === undefined) {
        return '';
      }
      return String(val);
    }
    return match;
  });
}
