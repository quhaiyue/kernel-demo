// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import {IIterator, toArray} from '@phosphor/algorithm';

import { ISignal, Signal } from '@phosphor/signaling';

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';

import {
  Dialog,
  showDialog,
  ToolbarButtonComponent
} from '@jupyterlab/apputils';

import { PathExt } from '@jupyterlab/coreutils';

import { ServiceManager, Session} from '@jupyterlab/services';

// const fetch = require('node-fetch');

/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-RunningSessions';

/**
 * The class name added to a running widget header.
 */
const HEADER_CLASS = 'jp-RunningSessions-header';

/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-RunningSessions-section';

/**
 * The class name added to the running sessions section header.
 */
const SECTION_HEADER_CLASS = 'jp-RunningSessions-sectionHeader';

/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-RunningSessions-sectionContainer';

/**
 * The class name added to the running kernel sessions section list.
 */
const LIST_CLASS = 'jp-RunningSessions-sectionList';

/**
 * The class name added to the running sessions items.
 */
const ITEM_CLASS = 'jp-RunningSessions-item';


/**
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-RunningSessions-itemLabel';

/**
 * The class name added to a running session item shutdown button.
 */
const SHUTDOWN_BUTTON_CLASS = 'jp-RunningSessions-itemShutdown';

/**
 * The class name added to a notebook icon.
 */
const NOTEBOOK_ICON_CLASS = 'jp-mod-notebook';

/**
 * The class name added to a console icon.
 */
const CONSOLE_ICON_CLASS = 'jp-mod-console';

/**
 * The class name added to a file icon.
 */
const FILE_ICON_CLASS = 'jp-mod-file';

/**
 * Properties for a session list displaying items of generic type `M`.
 */
type SessionProps<M> = {
  /**
   * A signal that tracks when the `open` is clicked on a session item.
   */
  openRequested: Signal<RunningSessions, M>;

  /**
   * The session manager.
   */
  manager: {
    /**
     * The function called when the shutdown all button is pressed.
     */
    shutdownAll(): void;

    /**
     * A signal that should emit a new list of items whenever they are changed.
     */
    runningChanged: ISignal<any, M[]>;

    /**
     * Returns a list the running models.
     */
    running(): IIterator<M>;

  };

  /**
   * The function called when the shutdown button is pressed on an item.
   */
  unbind: (model: M) => void;

  /**
   * The function called when the bind button is pressed on an item.
   */
  bind: (model: M) => void;

  /**
   * The filter that is applied to the items from `runningChanged`.
   */
  filterRunning?: (model: M) => boolean;

  /**
   * The name displayed to the user.
   */
  name: string;

  /**
   * Returns the icon class for an item.
   */
  iconClass: (model: M) => string;

  /**
   * Returns the label for an item.
   */
  label: (model: M) => string;

  /**
   * Called to determine the `title` attribute for each item, which is revealed
   * on hover.
   */
  labelTitle?: (model: M) => string;

  /**
   * Flag that sets whether it sessions should be displayed.
   */
  available: boolean;
};
/**
 * PExecute and handle replies.
 */

function Item<M>(props: SessionProps<M> & { model: M }) {
  const { model } = props;
  return (
    <li className={ITEM_CLASS}>
      <span
        className={ITEM_LABEL_CLASS}
        title={props.labelTitle ? props.labelTitle(model) : ''}
        onClick={() => props.openRequested.emit(model)}
      >
        {props.label(model)}
      </span>
      <button
        className={`${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`}
        onClick={() => props.unbind(model)}
      >
        解绑
      </button>
      <button
        className={`${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`}
        onClick={() => props.bind(model)}
      >
        绑定
      </button>
    </li>
  );
}

function ListView<M>(props: { models: M[] } & SessionProps<M>) {
  const { models, ...rest } = props;
  return (
    <ul className={LIST_CLASS}>
      {models.map((m, i) => (
        <Item key={i} model={m} {...rest} />
      ))}
    </ul>
  );
}

function List<M>(props: SessionProps<M>) {
  const initialModels = toArray(props.manager.running());
  const filterRunning = props.filterRunning || (_ => true);
  function render(models: Array<M>) {
    return <ListView models={models.filter(filterRunning)} {...props} />;
  }
  if (!props.available) {
    return render(initialModels);
  }
  return (
    <UseSignal
      signal={props.manager.runningChanged}
      initialArgs={initialModels}
    >
      {(sender: any, args: Array<M>) => render(args)}
    </UseSignal>
  );
}

/**
 * The Section component contains the shared look and feel for an interactive
 * list of kernels and sessions.
 *
 * It is specialized for each based on it's props.
 */
function Section<M>(props: SessionProps<M>) {
  function onShutdown() {
    void showDialog({
      title: `Shut Down All ${props.name} Sessions?`,
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({ label: 'Shut Down All' })
      ]
    }).then(result => {
      if (result.button.accept) {
        props.manager.shutdownAll();
      }
    });
  }
  return (
    <div className={SECTION_CLASS}>
      {props.available && (
        <>
          <header className={SECTION_HEADER_CLASS}>
            <h2>{props.name} Sessions</h2>
            <ToolbarButtonComponent
              tooltip={`Shut Down All ${props.name} Sessions…`}
              iconClassName="jp-CloseIcon"
              onClick={onShutdown}
            />
          </header>

          <div className={CONTAINER_CLASS}>
            <List {...props} />
          </div>
        </>
      )}
    </div>
  );
}

interface IRunningSessionsProps {
  session:Session.ISession;
  manager: ServiceManager.IManager;
  sessionOpenRequested: Signal<RunningSessions, Session.IModel>;
}

function RunningSessionsComponent({
                                    session,
                                    manager,
                                    sessionOpenRequested
                                  }: IRunningSessionsProps) {
  return (
    <>
      {/*刷新*/}
      <div className={HEADER_CLASS}>
        <ToolbarButtonComponent
          tooltip="Refresh List"
          iconClassName="jp-RefreshIcon"
          onClick={() => {
            void manager.sessions.refreshRunning();
          }}
        />
      </div>
      <Section
        openRequested={sessionOpenRequested}
        manager={manager.sessions}
        filterRunning={m =>
          !!((m.name || PathExt.basename(m.path)).indexOf('.') !== -1 || m.name)
        }
        name="Kernel"
        iconClass={m => {
          if ((m.name || PathExt.basename(m.path)).indexOf('.ipynb') !== -1) {
            return NOTEBOOK_ICON_CLASS;
          } else if (m.type.toLowerCase() === 'console') {
            return CONSOLE_ICON_CLASS;
          }
          return FILE_ICON_CLASS;
        }}
        label={m => m.name || PathExt.basename(m.path)}
        available={true}
        labelTitle={m => {
          let kernelName = m.kernel.name;
          if (manager.specs) {
            const spec = manager.specs.kernelspecs[kernelName];
            kernelName = spec ? spec.display_name : 'unknown';
          }
          return `Path: ${m.path}\nKernel: ${kernelName}`;
        }}
        unbind={m => {
          sessionOpenRequested.emit(m)
          let future = manager.sessions.connectTo(m).kernel.requestExecute({code: '% quit'});
          future.done.then(() => {
            console.log('Future is fulfilled');
          });
          future.onIOPub = msg => {
            console.log(msg.content); // Print rich output data.
          };
        }}
        bind={m => {
          let url = window.location.href
          let baseUrl = url.indexOf('jupyter') > -1 ? url.substring(url.indexOf('jupyter'), 0) : url.substring(url.indexOf('lab'), 0)
          console.log(baseUrl)
          var posts: any[] = []
          fetch(baseUrl + 'api/datasets/list?pageNo=1&pageSize=999&isPublic=2',{
            method: 'get',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json',
              'X-Request-With': 'XMLHttpRequest'
            }
          }).then(function(response:any){
            console.log(response)
            return response.json();
          }).then(function(data:any){
            let dataArr = data.datasets
            // let data1:any = {"code": 200, "msg": "Get Successfully!", "datasets": [{"id": 2589, "updateTime": "2019-09-19 15:35:13", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 2589, "datasetsId": 5433, "dataSourceName": "city", "companyName": "TsingJ", "relatedKernels": 9, "relatedDatasets": 0, "dataSize": 2.1972658447265846e+21, "tags": [], "views": 3, "collections": 0, "favorites": 0, "isViewed": 0, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 5433, "key": "ahi_data", "type": "double", "shape": "72000,4", "isPublic": 1, "sample": "<N/A>"}, {"dsId": 70, "datasetsId": 5432, "key": "aqi_data", "type": "double", "shape": "72000,4", "sample": "<N/A>"}, {"dsId": 70, "datasetsId": 5431, "key": "pop_data", "type": "double", "shape": "72000,4", "sample": "<N/A>"}, {"dsId": 70, "datasetsId": 5430, "key": "pm_2_5_data", "type": "double", "shape": "72000,4", "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 2333, "updateTime": "2019-09-10 17:54:43", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 2333, "datasetsId": 4864, "dataSourceName": "gold60", "companyName": "TsingJ", "relatedKernels": 3, "relatedDatasets": 0, "dataSize": 157.88, "tags": [], "views": 1, "collections": 0, "favorites": 0, "isViewed": 0, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 4864, "key": "tableG60", "type": "int32", "shape": "10346520,4", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 1746, "updateTime": "2019-09-04 10:19:07", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 1746, "datasetsId": 3587, "dataSourceName": "FIFA_position_mini_s", "companyName": "TsingJ", "relatedKernels": 3, "relatedDatasets": 0, "dataSize": 0.05, "tags": [], "views": 0, "collections": 0, "favorites": 0, "isViewed": 0, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 3587, "key": "FIFA_pos_mini", "type": "int32", "shape": "500,28", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 501, "updateTime": "2019-08-26 18:11:10", "isDelete": 0, "userId": 8, "username": "admin1", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 501, "datasetsId": 748, "dataSourceName": "house_prices", "companyName": "TsingJ", "relatedKernels": 9, "relatedDatasets": 0, "dataSize": 0.2, "tags": [], "views": 3, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 748, "key": "train", "type": "int32", "shape": "1459,36", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 499, "updateTime": "2019-09-04 10:21:26", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 499, "datasetsId": 746, "dataSourceName": "LA-stop_data_1M", "companyName": "TsingJ", "relatedKernels": 7, "relatedDatasets": 0, "dataSize": 1.01, "tags": [], "views": 4, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 746, "key": "stop_1M", "type": "int32", "shape": "24001,11", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 443, "updateTime": "2019-08-26 18:11:10", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": "data:image/png;base64,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", "brief": "dsafgadsfasd", "dataSourceId": 443, "datasetsId": 499, "dataSourceName": "gold", "companyName": "TsingJ", "relatedKernels": 15, "relatedDatasets": 0, "dataSize": 0.06, "tags": [], "views": 6, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 499, "key": "tableB", "type": "double", "shape": "1940,4", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 437, "updateTime": "2019-08-29 17:27:28", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": "\u8fd9\u662fgold\u6570\u636e\u3002", "portrait": null, "brief": null, "dataSourceId": 437, "datasetsId": 486, "dataSourceName": "gold_preprocess", "companyName": "TsingJ", "relatedKernels": 0, "relatedDatasets": 0, "dataSize": 0.0, "tags": [], "views": 3, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 69, "datasetsId": 486, "key": "tableB_1562257099169", "type": "double", "shape": "2", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 435, "updateTime": "2019-08-26 18:13:41", "isDelete": 0, "userId": 8, "username": "admin1", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 435, "datasetsId": 483, "dataSourceName": "demo_data", "companyName": "TsingJ", "relatedKernels": 1, "relatedDatasets": 0, "dataSize": 0.01, "tags": [], "views": 6, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 483, "key": "world-happiness-report-2019.csv", "type": "int32", "shape": "155,10", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 402, "updateTime": "2019-08-26 18:11:10", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": "data:image/png;base64,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", "brief": "this is an adult dataset", "dataSourceId": 402, "datasetsId": 407, "dataSourceName": "adult", "companyName": "TsingJ", "relatedKernels": 1, "relatedDatasets": 0, "dataSize": 0.09, "tags": [], "views": 4, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 407, "key": "adult1", "type": "int32", "shape": "24800", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 356, "updateTime": "2019-07-08 19:41:30", "isDelete": 0, "userId": 11, "username": "debug", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 356, "datasetsId": 305, "dataSourceName": "single", "companyName": "TsingJ", "relatedKernels": 5, "relatedDatasets": 0, "dataSize": 0.0, "tags": [], "views": 2, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": -1, "datasetsId": 305, "key": "single1", "type": "int32", "shape": "1", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 212, "updateTime": "2019-06-06 16:32:28", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 212, "datasetsId": 63, "dataSourceName": "adult", "companyName": "TsingJ", "relatedKernels": 5, "relatedDatasets": 0, "dataSize": 0.09, "tags": [], "views": 2, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": -1, "datasetsId": 63, "key": "adult1", "type": "int32", "shape": "24800", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}], "pageNo": 1, "pageSize": 16, "totalNum": 11, "totalPages": 1}
            // let dataArr:any = data1.datasets
            for (let i in dataArr) {
              for (let n in dataArr[i].samples) {
                let obj:any = {}
                obj.id = dataArr[i].samples[n].datasetsId
                obj.dataSetId = dataArr[i].dataSourceId
                obj.key = dataArr[i].samples[n].key
                obj.dataSetName = dataArr[i].dataSourceName
                obj.dsId = dataArr[i].samples[n].dsId
                obj.userId = dataArr[i].userId
                obj.username = dataArr[i].username
                posts.push(obj)
              }
            }
            console.log(data)
          })
          // let data1:any = {"code": 200, "msg": "Get Successfully!", "datasets": [{"id": 2589, "updateTime": "2019-09-19 15:35:13", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 2589, "datasetsId": 5433, "dataSourceName": "city", "companyName": "TsingJ", "relatedKernels": 9, "relatedDatasets": 0, "dataSize": 2.1972658447265846e+21, "tags": [], "views": 3, "collections": 0, "favorites": 0, "isViewed": 0, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 5433, "key": "ahi_data", "type": "double", "shape": "72000,4", "isPublic": 1, "sample": "<N/A>"}, {"dsId": 70, "datasetsId": 5432, "key": "aqi_data", "type": "double", "shape": "72000,4", "sample": "<N/A>"}, {"dsId": 70, "datasetsId": 5431, "key": "pop_data", "type": "double", "shape": "72000,4", "sample": "<N/A>"}, {"dsId": 70, "datasetsId": 5430, "key": "pm_2_5_data", "type": "double", "shape": "72000,4", "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 2333, "updateTime": "2019-09-10 17:54:43", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 2333, "datasetsId": 4864, "dataSourceName": "gold60", "companyName": "TsingJ", "relatedKernels": 3, "relatedDatasets": 0, "dataSize": 157.88, "tags": [], "views": 1, "collections": 0, "favorites": 0, "isViewed": 0, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 4864, "key": "tableG60", "type": "int32", "shape": "10346520,4", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 1746, "updateTime": "2019-09-04 10:19:07", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 1746, "datasetsId": 3587, "dataSourceName": "FIFA_position_mini_s", "companyName": "TsingJ", "relatedKernels": 3, "relatedDatasets": 0, "dataSize": 0.05, "tags": [], "views": 0, "collections": 0, "favorites": 0, "isViewed": 0, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 3587, "key": "FIFA_pos_mini", "type": "int32", "shape": "500,28", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 501, "updateTime": "2019-08-26 18:11:10", "isDelete": 0, "userId": 8, "username": "admin1", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 501, "datasetsId": 748, "dataSourceName": "house_prices", "companyName": "TsingJ", "relatedKernels": 9, "relatedDatasets": 0, "dataSize": 0.2, "tags": [], "views": 3, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 748, "key": "train", "type": "int32", "shape": "1459,36", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 499, "updateTime": "2019-09-04 10:21:26", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 499, "datasetsId": 746, "dataSourceName": "LA-stop_data_1M", "companyName": "TsingJ", "relatedKernels": 7, "relatedDatasets": 0, "dataSize": 1.01, "tags": [], "views": 4, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 746, "key": "stop_1M", "type": "int32", "shape": "24001,11", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 443, "updateTime": "2019-08-26 18:11:10", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": "data:image/png;base64,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", "brief": "dsafgadsfasd", "dataSourceId": 443, "datasetsId": 499, "dataSourceName": "gold", "companyName": "TsingJ", "relatedKernels": 15, "relatedDatasets": 0, "dataSize": 0.06, "tags": [], "views": 6, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 499, "key": "tableB", "type": "double", "shape": "1940,4", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 437, "updateTime": "2019-08-29 17:27:28", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": "\u8fd9\u662fgold\u6570\u636e\u3002", "portrait": null, "brief": null, "dataSourceId": 437, "datasetsId": 486, "dataSourceName": "gold_preprocess", "companyName": "TsingJ", "relatedKernels": 0, "relatedDatasets": 0, "dataSize": 0.0, "tags": [], "views": 3, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 69, "datasetsId": 486, "key": "tableB_1562257099169", "type": "double", "shape": "2", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 435, "updateTime": "2019-08-26 18:13:41", "isDelete": 0, "userId": 8, "username": "admin1", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 435, "datasetsId": 483, "dataSourceName": "demo_data", "companyName": "TsingJ", "relatedKernels": 1, "relatedDatasets": 0, "dataSize": 0.01, "tags": [], "views": 6, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 483, "key": "world-happiness-report-2019.csv", "type": "int32", "shape": "155,10", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 402, "updateTime": "2019-08-26 18:11:10", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAANFUlEQVR4nO2ba3Rc1XWAv31HsuQHxMg2tZKaQkIh9QJccMM7iUhAM4qJE9MqaTHQEBKbWDN3JGETCpQoC0MTYyTNXMnEopAuA4XYKSuFFs0I2zgBbAJ1IU0gPEKTmqzYGPzGWBrNvbs/JBlLOvfeGVlerK7O90s6++zH7LmPffY5AyVKlChRokSJEiVKlChRokSJEiVK/J9BPuwAhlhS0zmlrCK/AIghcg5wEjBJoRfYJqovqSXZvv6Kf+lav3jfhxvtB3zoCRxInHcTogng+HANPagqP4j0ucvbNzXtPdbxhfGhJtCOtV+MWg8hnFSsrsIOz/Ou6expfPJYxFYo457Aq2vvmjw1UnGRoGepJzOBCBYbnW778SPnxWudr1qWtwZkwlG4y6P6rXQ2+Y9HDi6Jtp5aJpGrgCpgN8rrZVr2dGtPw1tH4cvIuCUwEU3PEWEZsACYNFKuaKuTSd4AEK9z6iz1HgMpGwfXHqp/k84m1wIk6tLni+p6kMmGuc+j2rH9+Op/XrfuK+44+D76BC6paZkSqaxaKfBNwAqY6nmenOqRy5dZ5S8xcHWME3qwH517T6bxtUQs/ZRATeBs+IWn7tc7s03/ebSegz5wKPal7SeVVVb9XGBxAbYsxT01YpW3E5y8zSr8bX9//hO9+fen5nBPUbgS5Sl/FZlchrUKQJA/DYtbYE5EIpsTdemFYXMLsDU24pc5H7Ui3rMgJxekoPQr7gIk8rgY/WoOpWHk8+xI7FjqrxW5TwyPCAAP9xIhslRgXmGfAk+Fa5xu+6EC549iTFdgS01LmUT0x4UmT0FF5NtI5Ium5CmoiiwMSh5AOpN8BJcFCsbnl0XZYvVkKbCjkLgAS5T7GqId5xQ43+BzDOyeOK1R4AL/GZpX6PGQf1ClycL781Qm0SYw3zRbkDVOt/3jQnw7T9o9QKdZ6s2bntv1m/73Ds5G9euo3KbKGoWdASYrLPHur69fGynE/0iKfgsm6tLHq+rNAff+426uP9G5cen/HDkYr3VOAa02KajoimJicL3+lWVWeZxRF4Act3fSjDPueaLhJeCHQ6Mt9S0Tdu2vSiAsF6gcaU9gTvX+7VcCDxQTB6MDKACXhQInmIXSlc7YXxqZPIAI7qkmDYW3nG77lWJCWNVzw1uoGnXyXv+ol0jLupack7XvVpF5QJ/ZqtVQTAyHtcagcYVpWOGXve/8Mj7w52hci6k+Fn9XdAwBepbKR/wUOroTG1X4jlEoel7T5a0fKzaIIhOoAlxo9I/e2bW1q99X1VM/2cTiYjjs0Kwn+McAlO3NpxX2mGT9ufKLiw2jqAQm6pyP+ZQQXuWB3n8P0pVIxPhmFPiz+tktRS7nVBQ50yzi7SDNti3Nh0R1ozEWS0NryJEUlUBxdaqPaNeKZ799IEi3r//9X2MuPyZXzzrhy8XEEY+lagVONMnUkl+FGhB+axxX38eML8Ul0Br7bdi1/qZ9wFaTTEVuXzS3xVgcj2TR3NXlQuROox143em2fx9uRYzxikiukBiOpKgEHsr3+hWoU+K1Kz8Zpq/Kw6ZxgdMqplc9FHYr19evjVTM6LtPUGPhK6jRvoG5xvjQQgvwwxSVwMGr6HdGQ1J+bQHe7vd7gIvw5epZ037WEG0zJidRl55dfWDHBoGrTXKF93NeblVYCIm69GxVzjMKhV+E6Y9WKZJENHWviHzDIDrkqvWpzmz85UD9WNoWSPnJdeBV/4Iqz4jou0CVIhegXCgSEK/qbels8vYg3/X1ayMzB76EzxoMHFCRGU637VMnmhnDUk7W+AgmWuJ127WpM4K0p2V2dyis97U+8KWeK0IzyJ0gSwUuCknez3vfrfxekN+v1fywsvrA9gfNyQNVWVds8gbjLZ5ELP2MwEXmQOhFcBD+yW+FcV20tWqyVfZTlMBkF8ibeSty8aonGozPr6Zoa5VL5EuI3ASc5mMj73lyZkdP4tVinY8pgXZtai4Wz4V3lPWQIjtFdaObjyzr3BDfNSRZVLNyemXlhH/FpzAvkBc9Vy7veDLxhyMH47H2JRbWYuCPFU4wt8+GxdmWziSbxxLAmLox6Z7kVkVuDp8pEwX+BJFrrXLvCWg57K9r09J3e9/5VY3CcnzXp35oXtHW/b27LxyZPDuaarCwOoGzgKrw5LF1f++eAj6LmaNq6duxVCtIU+HOvHNTmcYXRo43xtpO9rCaQRYS0K1W2Kfoj7Q/f3fnhhteN81JxFIvCzK7sIDk15JzL0ltaAxcvQSaGKviEMmY06To94DQ5ZgKNU63/VM/+aK5q8srp/V+ighzRWWWp94UkchB1Pu9q/rijI/sfa5lXUtgsWvHUr8tpNGrkC3T/JVt2ebdYXODGJdduWSs/SwPq03gc/6zdHtkn/uJti3Nh8bq5/pY28nlEvkLcfUP6Z7kFgydHzuaakck6RsFvAd838kk7gAxdo6KYdy2NZOx9tMVa7UqnxlVcghv5NVbuMpw+y6KtlVXEIkDZwNviuvdlV7fuG3kPLsulUBp/eDFpf+tyA/68u93DRb4A/bmtkyqmF51vwj1DD7jVdkpwmSFSTKQNVfQh/Na9t1V2YbfHM3nPvptzdrOWWVW/naQq4DhbXHRZW5fZF3nxvg2Rlwti2pWTq+oKLsFsa4f1iVWfbsX7+yubNP2oaF4rXOKWPqGjLQ/YHQfSute7bv7gZ5lB4fGr4u2Vk3IM/WQK7uPr7A+i8hPDOHnQDsrJ/R+Z8Vjwc0QP8acwEVzV5dXnth7o6rc7LdLpvCsk7GH9djqqY/8UfTiuIW0IH7dD2lJZxLfHfovUZteKBYPBsWj8BZCw8gTEACJWDolYAfpCnptOpPcEOTDxJjKmERdenbFjL4XUFnul7xBhnU9Gj7fcVp17NObLZF2/+QBeB8d9h9e6JEMgVmiPJaItq8a2ZSQkCaBwCygx65L3RLmZyRFJzBe63wV5QWBOWFzRfTRob+TMac+Uu5tBc4NdaIMe1N39jQ+DfQUEp+I9a3qWSc8eeP87x93eKxf79fQrU6xUFlux1L3DnbeC6KoBNqxVLNY+nDIVQeop7C6d+fLKwDsqHOjh/4ImBLuRe9LZ5Mj21KqwnxElim8GWpC5DO9uYk9i764ehJAakPj25L3zgN9BNQLUf6GHUt3hMc5OLvQiWFdlEE8kLWC25LKNL4GkIimbxbhjgJc9Li4LZ2Zpi0h8yRRl74c5VYJuZpV+YmTta/giBeYXZs6A6EVkcuCP4jX0JFpDG2PFZTARDQ9T4THCLhiFf4DpcHJ2s8PjcVj7VdZWIF7rQqvoCSdrO3bofGNqy69UJQ2YEaA/aSTsdMjx+1o6mpEOvA51KlKr6qcHdZgCL2Fl3yhc6YIa/znah7RW3ccN/P8YcmrdT5pYa32s6vgKizfsW332WNJHoDTbT/Uq+4c0M1+c0S54/rPjd6uTGeTD3he7jww74+IUCmWtofFEJrAiOu247M+VdjnQizdnbxj5Hk7y9J78X9W7kGJORn779e9Erw0C6Mr27Q9ss+9FDCXIMKUCRPKbzOJOnqWvkreqwGM+ygC0XidY2zbDRGYwIZo2zkIXzFL9YBF5LJOQ+1kx1ILAOMeq8IeVS4Z61Vnom1L8yEVrlAwrioUvWZp7T3GXbz0+sZtOrBqyZvk4mkiyHdgAiNiNfm1gxT5WirTMGppNuj2Rh+TeVH9SydrF733EIbTbe+3POs6NayPBSr7pP/KAN3nAOPjRoT5S2o6fasH3wQuqemcoshfmaX6iJOxHzVJ4pe2ngmcb9SCtnQ2GXBQ8uhI9cR/ZikZk0zQBYHKeW+Fz7G5iVZlv2+TxDeB5RX9UdNJJsBVkVv99CRSZg5UdS/Ccj+98cJV6TK6Ry64uvYu07lpYOBWhuEF/BCC5Xvkw78sseTT5kB4yum2/YtZ4RKznjzodNv7ffXGifID/dnBH+cMD0sonxqpMB8HGcRS84tIwFfPP4Eq5lObPrfIB87UuGmNxahF/rGgbUvzIZT/8hEHdqpV9CXjOHzcTyfoJXKy0Zi6L/opXF9714kgx5lk+QMHfV4444+IvmYc9yT4+JrHqD4kgMBMP5WgBBqre0st385IhVVudiTsveeZvzOeSDgWKOLTOPCmBenl8q5fjL7PTt8E+rxAyEnO94d+nljmwlnZ66dzTFDeMw6LGD/TEJWeHPQR+S55g9a2hoPZevDV3EHfTZgyzzJ2dUMOeY8/4nNGMOSLbN/UtBfljdFq+P4gx/8KVL17lCGR1KZNLcaKHaAtG38F1dFH2NQr+vD2USE8irLryCGFXo98AXHo4hFX8B4U3/PTvglMZ5MrUP2mwtOobkbUdrpt3/pvyLvnWfNR/TfQnCI7VbnFyTYW3F8bD5xu+x2FzytsBHYrPK+eO68z2xx48AkgnU0+5XmHThdhkQrXqXD6kU2SEiVKlChRokSJEiVKlChRokSJEiVK/P/lfwHE4/LuxLK5nwAAAABJRU5ErkJggg==", "brief": "this is an adult dataset", "dataSourceId": 402, "datasetsId": 407, "dataSourceName": "adult", "companyName": "TsingJ", "relatedKernels": 1, "relatedDatasets": 0, "dataSize": 0.09, "tags": [], "views": 4, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": 70, "datasetsId": 407, "key": "adult1", "type": "int32", "shape": "24800", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 356, "updateTime": "2019-07-08 19:41:30", "isDelete": 0, "userId": 11, "username": "debug", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 356, "datasetsId": 305, "dataSourceName": "single", "companyName": "TsingJ", "relatedKernels": 5, "relatedDatasets": 0, "dataSize": 0.0, "tags": [], "views": 2, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": -1, "datasetsId": 305, "key": "single1", "type": "int32", "shape": "1", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}, {"id": 212, "updateTime": "2019-06-06 16:32:28", "isDelete": 0, "userId": 2, "username": "admin", "dsUserId": 2, "companyId": 3, "description": null, "portrait": null, "brief": null, "dataSourceId": 212, "datasetsId": 63, "dataSourceName": "adult", "companyName": "TsingJ", "relatedKernels": 5, "relatedDatasets": 0, "dataSize": 0.09, "tags": [], "views": 2, "collections": 0, "favorites": 0, "isViewed": 1, "isCollected": 0, "isFavorited": 0, "samples": [{"dsId": -1, "datasetsId": 63, "key": "adult1", "type": "int32", "shape": "24800", "isPublic": 1, "sample": "<N/A>"}], "source": 1, "authorizationType": 2}], "pageNo": 1, "pageSize": 16, "totalNum": 11, "totalPages": 1}
          // let dataArr:any = data1.datasets
          // for (let i in dataArr) {
          //   for (let n in dataArr[i].samples) {
          //     let obj: any = {}
          //     obj.id = dataArr[i].samples[n].datasetsId
          //     obj.dataSetId = dataArr[i].dataSourceId
          //     obj.key = dataArr[i].samples[n].key
          //     obj.dataSetName = dataArr[i].dataSourceName
          //     obj.dsId = dataArr[i].samples[n].dsId
          //     obj.userId = dataArr[i].userId
          //     obj.username = dataArr[i].username
          //     posts.push(obj)
          //   }
          // }
          console.log(posts)
          // const posts: any[] = [
          //   {id: 483, dataSetId: 435, key: "world-happiness-report-2019.csv", dataSetName: "demo_data", dsId: 70, dsName: "k8s-c1id", userId: 8, username: "admin1", dsUserId: 2},
          //   {id: 746, dataSetId: 499, key: "stop_1M", dataSetName: "LA-stop_data_1M", dsId: 70, dsName: "k8s-c1id", userId: 2, username: "admin", dsUserId: 2},
          //   {id: 3587, dataSetId: 1746, key: "FIFA_pos_mini", dataSetName: "FIFA_position_mini_s", dsId: 70, dsName: "k8s-c1id", userId: 2, username: "admin", dsUserId: 2},
          //   {id: 5430, dataSetId: 2589, key: "pm_2_5_data", dataSetName: "city", dsId: 70, dsName: "k8s-c1id", userId: 2, username: "admin", dsUserId: 2},
          //   {id: 5431, dataSetId: 2589, key: "pop_data", dataSetName: "city", dsId: 70, dsName: "k8s-c1id", userId: 2, username: "admin", dsUserId: 2},
          //   {id: 5432, dataSetId: 2589, key: "aqi_data", dataSetName: "city", dsId: 70, dsName: "k8s-c1id", userId: 2, username: "admin", dsUserId: 2},
          //   {id: 5433, dataSetId: 2589, key: "ahi_data", dataSetName: "city", dsId: 70, dsName: "k8s-c1id", userId: 2, username: "admin", dsUserId: 2}
          //   ]
          posts.map((e) => {
            e.isChecked = false;
            e.varName = '';
          });
          // 定义所选数组
          let checkDataArr:any = []

          // 定义你弹窗内部结构
          const body = (
            <ul className="bind-list-wrap n-li">
              {posts.map((item) =>
                <li key={item.id} className="flex align-center fb">
                  <div className="flex align-center">
                    <input type="checkbox" onChange={()=>{
                      item.isChecked = !item.isChecked
                      if (item.isChecked) {
                        checkDataArr.push(item)
                      } else {
                        for (let i in checkDataArr) {
                          if (checkDataArr[i].id === item.id) {
                            checkDataArr.splice(i,1)
                          }
                        }
                      }
                    }}/>
                    <span>{item.key}</span>
                  </div>
                  <input type="text" onChange={(e) => {
                    item.varName = e.target.value
                  }}/>
                </li>
              )}
            </ul>
          );
          // 弹窗
          void showDialog({
            title: `数据列表`,
            body,
            buttons: [
              Dialog.cancelButton({ label: '取消' }),
              Dialog.warnButton({ label: '绑定' })
            ]
          }).then(result => {
            let arr: any = [];
            for (let v in checkDataArr) {
              let str = '';
              str = '("' + checkDataArr[v].varName + '", ' + checkDataArr[v].dsId + ', ' + checkDataArr[v].dataSetId + ', ' + checkDataArr[v].id + ')'
              arr.push(str)
            }
            let code = '% bind --task="' + m.name + '" --sources=[' + arr.join(',') + ']'
            if (result.button.accept) {
              sessionOpenRequested.emit(m)
              let future = manager.sessions.connectTo(m).kernel.requestExecute({code: code});
              future.done.then(() => {
                console.log('Future is fulfilled');
              });
              future.onIOPub = msg => {
                console.log(msg.content); // Print rich output data.
              };
            }
          });
        }}
      />
    </>
  );
}

/**
 * A class that exposes the running terminal and kernel sessions.
 */
export class RunningSessions extends ReactWidget {
  /**
   * Construct a new running widget.
   */
  constructor(options: RunningSessions.IOptions) {
    super();
    this.options = options;

    // this can't be in the react element, because then it would be too nested
    this.addClass(RUNNING_CLASS);
  }

  protected render() {
    return (
      <RunningSessionsComponent
        session={this._session}
        manager={this.options.manager}
        sessionOpenRequested={this._sessionOpenRequested}
      />
    );
  }

  /**
   * A signal emitted when a kernel session open is requested.
   */
  get sessionOpenRequested(): ISignal<this, Session.IModel> {
    return this._sessionOpenRequested;
  }

  private _sessionOpenRequested = new Signal<this, Session.IModel>(this);
  private options: RunningSessions.IOptions;
  private _session: Session.ISession;
}


//

//

/**
 * The namespace for the `RunningSessions` class statics.
 */
export namespace RunningSessions {
  /**
   * An options object for creating a running sessions widget.
   */
  export interface IOptions {
    /**
     * A service manager instance.
     */
    manager: ServiceManager.IManager;
  }
}
