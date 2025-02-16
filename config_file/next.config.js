/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['example.com'], // 允许从 example.com 加载图片
  },
  async redirects() {
    return [
      // 示例重定向
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      // 示例重写
      {
        source: '/api/:path*',
        destination: 'https://api.example.com/:path*',
      },
    ]
  },
  env: {
    // 环境变量
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // 如果你使用了 webpack，可以在这里添加自定义配置
  webpack: (config, { isServer }) => {
    // 自定义 webpack 配置
    return config
  },
};

module.exports = nextConfig;