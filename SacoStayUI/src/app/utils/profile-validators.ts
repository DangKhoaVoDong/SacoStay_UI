import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Chữ cái (Unicode, gồm tiếng Việt) và khoảng trắng — không số, không ký tự đặc biệt. */
const PERSON_NAME_PATTERN = /^[\p{L}\s]+$/u;

export const MIN_PROFILE_AGE = 15;
export const MIN_BIRTH_YEAR = 1950;
export const DATE_OF_BIRTH_INVALID_MESSAGE = 'Ngày sinh không phù hợp';
export const PERSON_NAME_INVALID_MESSAGE = 'Chỉ được dùng chữ cái, không số hoặc ký tự đặc biệt';

export function personNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    if (!PERSON_NAME_PATTERN.test(value)) {
      return { personName: true };
    }
    return null;
  };
}

export function minimumAgeValidator(minAge = MIN_PROFILE_AGE): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) return null;

    const birth = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return { invalidDateOfBirth: true };
    }

    const today = startOfDay(new Date());
    if (birth.getTime() > today.getTime()) {
      return { invalidDateOfBirth: true };
    }

    const earliestBirth = startOfDay(new Date(MIN_BIRTH_YEAR, 0, 1));
    if (birth.getTime() < earliestBirth.getTime()) {
      return { invalidDateOfBirth: true };
    }

    const latestAllowedBirth = startOfDay(new Date(today));
    latestAllowedBirth.setFullYear(latestAllowedBirth.getFullYear() - (minAge + 1));
    if (birth.getTime() > latestAllowedBirth.getTime()) {
      return { invalidDateOfBirth: true };
    }

    return null;
  };
}

export function personNameErrorMessage(): string {
  return PERSON_NAME_INVALID_MESSAGE;
}

export function dateOfBirthErrorMessage(errors: ValidationErrors | null | undefined): string {
  if (errors?.['required']) return 'Chọn ngày sinh';
  if (errors?.['invalidDateOfBirth']) return DATE_OF_BIRTH_INVALID_MESSAGE;
  return DATE_OF_BIRTH_INVALID_MESSAGE;
}

export function maxDateOfBirthInput(minAge = MIN_PROFILE_AGE): string {
  const d = startOfDay(new Date());
  d.setFullYear(d.getFullYear() - (minAge + 1));
  return formatDateInput(d);
}

export function minDateOfBirthInput(year = MIN_BIRTH_YEAR): string {
  return `${year}-01-01`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
