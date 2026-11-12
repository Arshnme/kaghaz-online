import reservedUsernames from '@/reserved-usernames.json'

/**
 * چک کردن اینکه آیا نام کاربری در لیست رزرو شده ها هست یا نه
 */
export function isUsernameReserved(username: string): boolean {
  const normalizedUsername = username.toLowerCase().trim()
  return reservedUsernames.reservedUsernames.includes(normalizedUsername)
}

/**
 * اعتبارسنجی کامل نام کاربری
 */
export function validateUsername(username: string): {
  isValid: boolean
  error?: string
} {
  // چک کردن طول
  if (username.length < 2 || username.length > 30) {
    return {
      isValid: false,
      error: "نام کاربری باید بین ۲ تا ۳۰ کاراکتر باشد"
    }
  }

  // چک کردن فرمت
  const usernameRegex = /^[a-zA-Z0-9_]+$/
  if (!usernameRegex.test(username)) {
    return {
      isValid: false,
      error: "نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و _ باشد"
    }
  }

  // چک کردن رزرو بودن
  if (isUsernameReserved(username)) {
    return {
      isValid: false,
      error: "این نام کاربری توسط شخص دیگری انتخاب شده است، لطفاً نام کاربری دیگری انتخاب نمایید"
    }
  }

  return { isValid: true }
}

/**
 * لیست نام‌های کاربری رزرو شده
 */
export function getReservedUsernames(): string[] {
  return reservedUsernames.reservedUsernames
}