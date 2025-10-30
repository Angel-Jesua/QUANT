import {
  trigger,
  state,
  style,
  transition,
  animate,
  keyframes
} from '@angular/animations';

// fadeInUp: para tarjetas y mensajes
export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'translateY(20px)'
    }),
    animate('0.5s ease-out', style({
      opacity: 1,
      transform: 'translateY(0)'
    }))
  ]),
  transition(':leave', [
    animate('0.3s ease-in', style({
      opacity: 0,
      transform: 'translateY(-10px)'
    }))
  ])
]);

// fadeInDown: para errores
export const fadeInDown = trigger('fadeInDown', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'translateY(-20px)'
    }),
    animate('0.4s ease-out', style({
      opacity: 1,
      transform: 'translateY(0)'
    }))
  ]),
  transition(':leave', [
    animate('0.2s ease-in', style({
      opacity: 0,
      transform: 'translateY(10px)'
    }))
  ])
]);

// fadeInOut: para botones con spinner
export const fadeInOut = trigger('fadeInOut', [
  transition(':enter', [
    style({
      opacity: 0
    }),
    animate('0.3s ease-in', style({
      opacity: 1
    }))
  ]),
  transition(':leave', [
    animate('0.3s ease-out', style({
      opacity: 0
    }))
  ])
]);

// Additional animations for better UX

// bounceIn: para elementos que necesitan más atención
export const bounceIn = trigger('bounceIn', [
  transition(':enter', [
    animate('0.6s', keyframes([
      style({
        opacity: 0,
        transform: 'scale(0.3)'
      }),
      style({
        opacity: 1,
        transform: 'scale(1.05)'
      }),
      style({
        transform: 'scale(0.9)'
      }),
      style({
        opacity: 1,
        transform: 'scale(1)'
      })
    ]))
  ])
]);

// slideInRight: para elementos que entran desde la derecha
export const slideInRight = trigger('slideInRight', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'translateX(30px)'
    }),
    animate('0.4s ease-out', style({
      opacity: 1,
      transform: 'translateX(0)'
    }))
  ])
]);

// shake: para errores de validación
export const shake = trigger('shake', [
  transition('active => inactive', [
    animate('0.5s', keyframes([
      style({ transform: 'translateX(0)' }),
      style({ transform: 'translateX(-10px)' }),
      style({ transform: 'translateX(10px)' }),
      style({ transform: 'translateX(-10px)' }),
      style({ transform: 'translateX(10px)' }),
      style({ transform: 'translateX(0)' })
    ]))
  ])
]);