const twilio = require("twilio");
const dotenv = require("dotenv");

dotenv.config();
// ==========================================
// 1. Twilio Client
// ==========================================

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


// ==========================================
// 2. Format Indian Phone Number
// ==========================================

const formatPhone = (phone) => {
  const number = String(phone).replace(/\D/g, "");

  // Example: 8292442614
  if (number.length === 10) {
    return `+91${number}`;
  }

  // Example: 918292442614
  if (
    number.length === 12 &&
    number.startsWith("91")
  ) {
    return `+${number}`;
  }

  throw new Error("Invalid Indian phone number");
};


// ==========================================
// 3. Send Phone OTP
// ==========================================

const sendPhoneOtp = async (phone) => {

  const formattedPhone = formatPhone(phone);

  const verification = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({
      to: formattedPhone,
      channel: "sms",
    });

  return verification;
};


// ==========================================
// 4. Verify Phone OTP
// ==========================================

const verifyPhoneOtp = async (phone, otp) => {

  const formattedPhone = formatPhone(phone);

  const verification = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({
      to: formattedPhone,
      code: String(otp),
    });

  return verification;
};


// ==========================================
// Export
// ==========================================

module.exports = {
  sendPhoneOtp,
  verifyPhoneOtp,
};