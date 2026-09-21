export function passwordMeetsLifeOSPolicy(value:string){
  return value.length>=12 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);
}

export const LIFEOS_PASSWORD_HINT="Use at least 12 characters with uppercase, lowercase, number and symbol.";
