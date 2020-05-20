module.exports = {
  title: 'XHR Cache Module',
  description: 'Cache application/json api resources and serve it as static resource with NuxtJS',
  themeConfig: {
    repo: 'gaetansenn/xhr-cache',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Edit this page on GitHub',
    sidebarDepth: 2,
    sidebar: {
      '/api/': [
        '/api/options',
        '/api/plugin',
        '/api/methods'
      ],
      '/': [
        {
          title: 'Guide',
          collapsable: false,
          children: [
            '/',
            '/guide/setup',
            '/guide/resource'
          ]
        },
        {
          title: 'Resources',
          collapsable: false,
          children: [
            '/resources/default',
            '/resources/custom'
          ]
        },
        {
          title: 'Recipes',
          collapsable: false,
          children: [
            '/recipes/extend'
          ]
        }
      ],
    },
    nav: [
      {
        text: 'Guide',
        link: '/'
      },
      {
        text: 'API',
        link: '/api/'
      }
    ]
  }
}
