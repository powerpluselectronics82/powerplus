// Indian Rupee Number to Words Converter
export function numberToWordsInINR(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Indian Rupee Zero Only';

  const numericValue = Math.round(Number(num));
  if (numericValue === 0) return 'Indian Rupee Zero Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 10) return single[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    const tensDigit = Math.floor(n / 10);
    const onesDigit = n % 10;
    return tens[tensDigit] + (onesDigit > 0 ? '-' + single[onesDigit] : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let str = '';
    if (hundred > 0) {
      str += single[hundred] + ' Hundred';
    }
    if (remainder > 0) {
      if (str.length > 0) str += ' ';
      str += convertTwoDigits(remainder);
    }
    return str;
  }

  let amount = numericValue;
  let words = '';

  // Crores (10,00,00,00)
  const crore = Math.floor(amount / 10000000);
  amount %= 10000000;

  // Lakhs (10,00,00)
  const lakh = Math.floor(amount / 100000);
  amount %= 100000;

  // Thousands (1,000)
  const thousand = Math.floor(amount / 1000);
  amount %= 1000;

  // Remaining Hundreds/Tens/Ones
  const remaining = amount;

  if (crore > 0) {
    words += convertThreeDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' Thousand ';
  }
  if (remaining > 0) {
    words += convertThreeDigits(remaining);
  }

  return `Indian Rupee ${words.trim()} Only`;
}
