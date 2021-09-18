import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GithubApiService } from './github-api.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { GithubCfg } from './github.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { GithubIssue, GithubIssueReduced } from './github-issue/github-issue.model';
import { truncate } from '../../../../util/truncate';

@Injectable({
  providedIn: 'root',
})
export class GithubCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _githubApiService: GithubApiService,
    private readonly _projectService: ProjectService,
    private readonly _snackService: SnackService,
  ) {}

  issueLink$(issueId: number, projectId: string): Observable<string> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => `https://github.com/${cfg.repo}/issues/${issueId}`),
    );
  }

  getById$(issueId: number, projectId: string): Observable<GithubIssue> {
    return this._getCfgOnce$(projectId).pipe(
      concatMap((githubCfg) => this._githubApiService.getById$(issueId, githubCfg)),
    );
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((githubCfg) =>
        githubCfg && githubCfg.isSearchIssuesFromGithub
          ? this._githubApiService
              .searchIssueForRepo$(searchTerm, githubCfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  async getFreshDataForIssue(
    task: Task,
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<{
    taskChanges: Partial<Task>;
    issue: GithubIssue;
    issueTitle: string;
  } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = await this._githubApiService.getById$(+task.issueId, cfg).toPromise();

    // const issueUpdate: number = new Date(issue.updated_at).getTime();
    const filterUserName = cfg.filterUsername && cfg.filterUsername.toLowerCase();
    const commentsByOthers =
      filterUserName && filterUserName.length > 1
        ? issue.comments.filter(
            (comment) => comment.user.login.toLowerCase() !== cfg.filterUsername,
          )
        : issue.comments;

    // TODO: we also need to handle the case when the user himself updated the issue, to also update the issue...
    const updates: number[] = [
      ...commentsByOthers.map((comment) => new Date(comment.created_at).getTime()),
      // todo check if this can be re-implemented
      // issueUpdate
    ].sort();
    const lastRemoteUpdate = updates[updates.length - 1];

    const wasUpdated = lastRemoteUpdate > (task.issueLastUpdated || 0);

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
        issueTitle: this._formatIssueTitleForSnack(issue.number, issue.title),
      };
    }
    return null;
  }

  getAddTaskData(issue: GithubIssueReduced): Partial<Task> & { title: string } {
    return {
      title: this._formatIssueTitle(issue.number, issue.title),
      issueWasUpdated: false,
      // NOTE: we use Date.now() instead to because updated does not account for comments
      issueLastUpdated: new Date(issue.updated_at).getTime(),
      isDone: this._isIssueDone(issue),
    };
  }

  private _formatIssueTitle(id: number, title: string): string {
    return `#${id} ${title}`;
  }

  private _formatIssueTitleForSnack(id: number, title: string): string {
    return `${truncate(this._formatIssueTitle(id, title))}`;
  }

  private _getCfgOnce$(projectId: string): Observable<GithubCfg> {
    return this._projectService.getGithubCfgForProject$(projectId).pipe(first());
  }

  private _isIssueDone(issue: GithubIssueReduced): boolean {
    return issue.state === 'closed';
  }
}
