import { Routes } from '@angular/router';
import { JournalListComponent } from './journal-list/journal-list.component';
import { JournalEntryComponent } from './journal-entry/journal-entry.component';
import { JournalDetailComponent } from './journal-detail/journal-detail.component';
import { JournalImportComponent } from './journal-import/journal-import.component';

export const JOURNAL_ROUTES: Routes = [
    { path: '', component: JournalListComponent },
    { path: 'new', component: JournalEntryComponent },
    { path: 'import', component: JournalImportComponent },
    { path: 'edit/:id', component: JournalEntryComponent },
    { path: ':id', component: JournalDetailComponent }
];
