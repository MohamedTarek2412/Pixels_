/** @type {import('next').NextConfig} */
const nextConfig = {
  // تعطيل الميدلوير
  experimental: {
    middleware: false, // هذا الخيار غير رسمي، لكن قد يعمل
  },
  // أو استخدم redirects بدلاً من الميدلوير
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
