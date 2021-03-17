export const randomString = (length = 8): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsLength = chars.length;

  let str = '';

  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * charsLength));
  }

  return str;
};
