import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Requisition } from './requisition';

describe('Requisition', () => {
  let component: Requisition;
  let fixture: ComponentFixture<Requisition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Requisition]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Requisition);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
