// frontend/karma.conf.js
// Configurar Chrome de Puppeteer como navegador por defecto
process.env.CHROME_BIN = require('puppeteer').executablePath();

// Detectar automáticamente navegadores instalados en el sistema
// Para usar Vivaldi, establecer la variable de entorno VIVALDI_BIN con la ruta del ejecutable
// Ejemplo: $env:VIVALDI_BIN = "C:\Users\TuUsuario\AppData\Local\Vivaldi\Application\vivaldi.exe"

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-edge-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/frontend'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    // Navegador por defecto para pruebas (ChromeHeadless usa Puppeteer)
    // Para cambiar el navegador, usa: ng test --browsers=Firefox
    // Navegadores disponibles: ChromeHeadless, Chrome, Firefox, FirefoxHeadless, Edge, EdgeHeadless, Vivaldi
    browsers: ['ChromeHeadless'],
    customLaunchers: {
      // Chrome Headless (usando Puppeteer - no requiere Chrome instalado)
      ChromeHeadless: {
        base: 'Chrome',
        flags: [
          '--no-sandbox',
          '--headless',
          '--disable-gpu',
          '--remote-debugging-port=9222'
        ]
      },
      // Firefox Headless (requiere Firefox instalado)
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['-headless']
      },
      // Edge Headless (requiere Edge instalado)
      EdgeHeadless: {
        base: 'Edge',
        flags: [
          '--headless',
          '--disable-gpu'
        ]
      },
      // Vivaldi (requiere establecer variable VIVALDI_BIN)
      Vivaldi: {
        base: 'Chrome',
        flags: [
          '--no-sandbox'
        ]
      }
    },
    restartOnFileChange: true
  });
};