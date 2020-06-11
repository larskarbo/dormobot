
export const timeValidate = (t) => {
  if(/\d\d:\d\d/.test(t)){
    return t
  }
  return false
}
