import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SACOSTAY_LOGO_CLASS, SACOSTAY_LOGO_URL } from '../../utils/brand-assets';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './footer.component.html'
})
export class FooterComponent {
    readonly logoUrl = SACOSTAY_LOGO_URL;
    readonly logoClass = SACOSTAY_LOGO_CLASS + ' !h-[4.55rem]';
}
