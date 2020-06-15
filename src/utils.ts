export const timeValidate = (t: string) => {
  if (/\d\d:\d\d/.test(t)) {
    return t;
  }
  return false;
};
