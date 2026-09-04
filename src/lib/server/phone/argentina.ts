import { parsePhoneNumberFromString } from "libphonenumber-js/max";

const ACCEPTED_CHARACTERS = /^[0-9 +().-]+$/;
const CANONICAL_ARGENTINA_MOBILE = /^\+549\d{10,11}$/;
const MINIMUM_INPUT_LENGTH = 8;
const MAXIMUM_INPUT_LENGTH = 32;

function parseArgentinaMobile(candidate: string): string | null {
  const phone = parsePhoneNumberFromString(candidate);

  if (
    phone?.country !== "AR" ||
    !phone.isValid() ||
    !CANONICAL_ARGENTINA_MOBILE.test(phone.number)
  ) {
    return null;
  }

  return phone.number;
}

function hasSupportedFormatting(value: string): boolean {
  return (
    value.length >= MINIMUM_INPUT_LENGTH &&
    value.length <= MAXIMUM_INPUT_LENGTH &&
    ACCEPTED_CHARACTERS.test(value) &&
    (!value.includes("+") ||
      (value.startsWith("+") && !value.slice(1).includes("+")))
  );
}

function normalizeExplicitInternational(
  digits: string,
  hasInternationalPrefix: boolean,
): string | null {
  if (hasInternationalPrefix) {
    const internationalDigits = digits.startsWith("00") ? digits.slice(2) : digits;
    return internationalDigits.startsWith("549")
      ? parseArgentinaMobile(`+${internationalDigits}`)
      : null;
  }

  return digits.startsWith("549") ? parseArgentinaMobile(`+${digits}`) : null;
}

function normalizeDomesticMobile(digits: string): string | null {
  const nationalDigits = digits.startsWith("0") ? digits.slice(1) : digits;
  const candidates: string[] = [];

  for (let areaLength = 2; areaLength <= 4; areaLength += 1) {
    const area = nationalDigits.slice(0, areaLength);
    const rest = nationalDigits.slice(areaLength);

    if (!area || !rest.startsWith("15")) {
      continue;
    }

    const normalized = parseArgentinaMobile(`+549${area}${rest.slice(2)}`);
    if (normalized) {
      candidates.push(normalized);
    }
  }

  return candidates.length === 1 ? candidates[0] ?? null : null;
}

export function normalizeArgentinaPhone(input: string): string | null {
  const value = input.normalize("NFKC").trim();

  if (!hasSupportedFormatting(value)) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  const hasLeadingPlus = value.startsWith("+");
  const hasZeroZeroPrefix = digits.startsWith("00");

  if (hasLeadingPlus && hasZeroZeroPrefix) {
    return null;
  }

  const hasInternationalPrefix = hasLeadingPlus || hasZeroZeroPrefix;
  const explicit = normalizeExplicitInternational(digits, hasInternationalPrefix);

  return explicit ?? (hasInternationalPrefix ? null : normalizeDomesticMobile(digits));
}
