import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-modal.component.html'
})
export class ReportModalComponent {
  @Input() isOpen = false;
  @Input() targetName = '';
  @Input() type: 'room' | 'user' = 'room';
  @Output() closed = new EventEmitter<void>();

  reason = '';
  submitted = false;

  close(): void {
    this.reason = '';
    this.submitted = false;
    this.closed.emit();
  }

  submit(): void {
    if (!this.reason.trim()) return;
    this.submitted = true;
  }
}
