import { trigger, transition, style, animate, query } from '@angular/animations';

export const routeFadeAnimation = trigger('routeFade', [
  transition('* <=> *', [
    query(':enter', [style({ opacity: 0 }), animate('220ms ease-out', style({ opacity: 1 }))], {
      optional: true
    })
  ])
]);
