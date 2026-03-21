const doFetch = async () => {
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          service_id: 'service_vsyjh2g',
          template_id: 'template_sbb94kl',
          user_id: 'nr8pT9rNIqTdlXzSy',
          template_params: {
              to_email: 'test@example.com',
              otp_code: '123456'
          }
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch(e) {
    console.log("Error:", e);
  }
};
doFetch();
