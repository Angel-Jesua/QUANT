import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ReverseEntryData {
  reversalDate: string;
  description: string;
}

@Component({
  selector: 'app-reverse-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reverse-modal.component.html',
  styleUrls: ['./reverse-modal.component.scss']
})
export class ReverseModalComponent implements OnChanges {
  @Input() entryNumber: string = '';
  @Input() originalDescription: string = '';
  @Input() isOpen: boolean = false;
  @Input() isLoading: boolean = false;
  
  @Output() confirm = new EventEmitter<ReverseEntryData>();
  @Output() cancel = new EventEmitter<void>();

  reversalDate: string = '';
  description: string = '';
  
  ngOnChanges(changes: SimpleChanges) {
    // Reset form values when modal opens
    if (changes['isOpen'] && this.isOpen) {
      this.reversalDate = new Date().toISOString().split('T')[0];
      this.description = `Reversión de ${this.entryNumber}: ${this.originalDescription}`;
    }
  }

  onConfirm() {
    if (!this.reversalDate) {
      return;
    }
    
    this.confirm.emit({
      reversalDate: this.reversalDate,
      description: this.description
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  onOverlayClick(event: MouseEvent) {
    // Close modal when clicking on overlay (outside modal content)
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onCancel();
    }
  }
}
