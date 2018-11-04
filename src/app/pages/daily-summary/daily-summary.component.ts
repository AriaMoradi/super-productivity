import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { getTodayStr } from '../../tasks/util/get-today-str';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { Router } from '@angular/router';
import { IS_ELECTRON } from '../../app.constants';
import { DialogGoogleExportTimeComponent } from '../../core/google/dialog-google-export-time/dialog-google-export-time.component';
import { MatDialog } from '@angular/material';
import { DialogSimpleTaskSummaryComponent } from '../../core/dialog-simple-task-summary/dialog-simple-task-summary.component';
import { Subscription } from 'rxjs';
import { ProjectService } from '../../project/project.service';
import { SimpleSummarySettings } from '../../project/project.model';

// TODO MOVE TO DEDICATED FILE
const IPC_EVENT_SHUTDOWN = 'SHUTDOWN';
const SUCCESS_ANIMATION_DURATION = 500;
const SUCCESS_ANIMATION_MAX_DURATION = 10000;


@Component({
  selector: 'daily-summary',
  templateUrl: './daily-summary.component.html',
  styleUrls: ['./daily-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailySummaryComponent implements OnInit, OnDestroy {
  public cfg: any = {};
  public doneTasks$ = this._taskService.doneTasks$;
  public todaysTasks$ = this._taskService.todaysTasks$;
  public todayStr = getTodayStr();
  public tomorrowsNote: string;
  public clearDoneTasks: boolean;
  public moveUnfinishedToBacklog: boolean;
  public commitLog;

  private successAnimationTimeout;
  private showSuccessAnimation;
  private successAnimationMaxTimeout;
  private _doneTasks: TaskWithSubTasks[];
  private _todaysTasks: TaskWithSubTasks[];
  private _simpleSummarySettings: SimpleSummarySettings;
  private _subs: Subscription = new Subscription();
  // calc total time spent on todays tasks
  totalTimeSpentTasks$ = this._taskService.totalTimeWorkedOnTodaysTasks$;

  // calc time spent on todays tasks today
  // use mysql date as it is sortable
  workingToday$ = this._taskService.workingToday$;

  constructor(
    private readonly _taskService: TaskService,
    private readonly _projectService: ProjectService,
    private readonly _router: Router,
    private readonly _matDialog: MatDialog
  ) {
  }

  ngOnInit() {
    this._subs.add(this.doneTasks$.subscribe((val) => {
      this._doneTasks = val;
    }));

    this._subs.add(this.todaysTasks$.subscribe((val) => {
      this._todaysTasks = val;
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  showExportModal() {
    this._matDialog.open(DialogSimpleTaskSummaryComponent, {
      data: {
        tasks: this._todaysTasks,
      }
    });

    // Dialogs('SIMPLE_TASK_SUMMARY', {
    //   settings: $rootScope.r.uiHelper.dailyTaskExportSettings,
    //   finishDayFn: finishDay,
    //   tasks: Tasks.getToday()
    // }, true);
  }

  showTimeSheetExportModal() {
    this._matDialog.open(DialogGoogleExportTimeComponent);
  }

  finishDay() {
    // $rootScope.r.tomorrowsNote = tomorrowsNote;
    // Tasks.finishDay(clearDoneTasks, moveUnfinishedToBacklog);
    const idsToMove = this._doneTasks.map((task) => task.id);
    this._taskService.moveToArchive(idsToMove);
    if (IS_ELECTRON) {
      // NOTE: syncing for electron is done in a before unload action
      //   $mdDialog.show(
      //     $mdDialog.confirm()
      //       .clickOutsideToClose(false)
      //       .title('All Done! Shutting down now..')
      //       .textContent('You work is done. Time to go home!')
      //       .ariaLabel('Alert Shutdown')
      //       .ok('Aye aye! Shutdown!')
      //       .cancel('No, just clear the tasks')
      //   )
      //     .then(() => {
      //         initSuccessAnimation(() => {
      //           window.ipcRenderer.send(IPC_EVENT_SHUTDOWN);
      //         });
      //       },
      //       () => {
      //         initSuccessAnimation(() => {
      //           $state.go('daily-planner');
      //         });
      //       });
    } else {
      //   if (GoogleDriveSync.config && GoogleDriveSync.config.isAutoSyncToRemote) {
      //     SimpleToast('CUSTOM', `Syncing Data to Google Drive.`, 'file_upload');
      //     GoogleDriveSync.saveTo();
      //   }
      this._initSuccessAnimation(() => {
        // $state.go('daily-planner');
        this._router.navigate(['/daily-planner']);
      });
    }
  }


  private _initSuccessAnimation(cb) {
    this.showSuccessAnimation = true;
    this.successAnimationTimeout = window.setTimeout(() => {
      if (cb) {
        cb();
      }
    }, SUCCESS_ANIMATION_DURATION);

    this.successAnimationMaxTimeout = window.setTimeout(() => {
      this.showSuccessAnimation = false;
    }, SUCCESS_ANIMATION_MAX_DURATION);
  }
}
