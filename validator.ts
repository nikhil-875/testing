export const isValidEmail = (email: string): boolean => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

type FullName = {
  firstName: string;
  lastName: string;
} | null;

export const isFullName = (name: string): FullName => {
  const invalidCharsRegex = /[\d@._]/;
  const isValid = name.split(' ').length > 1 && !invalidCharsRegex.test(name) && name.trim().length > 0;

  if (isValid) {
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ');
    return { firstName, lastName };
  }
  return null;
};

export const isMissing = (value: any): boolean => {
  return (
    !value ||
    value === "" ||
    (typeof value === "string" && value.toLowerCase().includes("not specified")) ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0)
  );
};
