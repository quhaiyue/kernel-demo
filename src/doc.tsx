// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import {IIterator, toArray} from '@phosphor/algorithm';

import { ISignal, Signal } from '@phosphor/signaling';

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';

import {
  Dialog,
  showDialog
} from '@jupyterlab/apputils';

import { PathExt } from '@jupyterlab/coreutils';

import { ServiceManager, Session} from '@jupyterlab/services';
import {any} from "prop-types";
import Toast from './notice'

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
   * The function called when the unbind button is pressed on an item.
   */
  unbind: (model: M) => void;

  /**
   * The function called when the bind button is pressed on an item.
   */
  bind: (model: M) => void;

  getBoundData: (model: M) => void;

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
   * 是否显示按钮
   */
  isShowButton: boolean;

  /**
   * 操作的id
   */
  checkedId: string;

  /**
   * Flag that sets whether it sessions should be displayed.
   */
  available: boolean;
};

// declare function getCookie(domReadyCallback: (name:string) => any): any
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
        style={{display:props.isShowButton ? 'none' : props.label(model) == props.checkedId ? 'block':'none'}}
      >
        解绑
      </button>
      <button
        className={`${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`}
        onClick={() => props.bind(model)}
        style={{display:props.isShowButton ? 'block' : props.label(model) == props.checkedId ? 'none':'block'}}
      >
        绑定
      </button>
      <button
        className={`${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`}
        onClick={() => props.getBoundData(model)}
      >
        数据
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
 * 获取cookie内容
 */
function getCookie (name:any){
  var arr;
  var reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
  if (arr = document.cookie.match(reg))
    return unescape(arr[2]);
  else
    return null;
}

/**
 * 向backend发送bind数据
 */
function bindToBackend(parmas: any) {
  let url = window.location.href
  let baseUrl = url.indexOf('jupyter') > -1 ? url.substring(url.indexOf('jupyter'), 0) : url.substring(url.indexOf('lab'), 0)
  fetch(baseUrl + 'api/binds/0',{
    method: "POST",
    body: JSON.stringify(parmas),
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'X-Request-With': 'XMLHttpRequest'
    }
  }).then(function(response:any){
    return response.json();
  }).then(function(data:any){
    if (data.code === 201) {
      console.log('绑定信息传递后台成功！')
    }
  })
}


/**
 * The Section component contains the shared look and feel for an interactive
 * list of kernels and sessions.
 *
 * It is specialized for each based on it's props.
 */
function Section<M>(props: SessionProps<M>) {
  return (
    <div className={SECTION_CLASS}>
      {props.available && (
        <>
          <header>
            <h2>数据绑定</h2>
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

interface IHomePageState {
  displayStyle: boolean;
  name: string
}


class RunningSessionsComponent extends React.Component<IRunningSessionsProps,IHomePageState> {
  constructor(props:IRunningSessionsProps) {
    super(props);
    this.state = { displayStyle: true, name: ''};
  }
  render() {
    const { manager, sessionOpenRequested } = this.props;
    return (
      <>
        {/*刷新*/}
        <div className={HEADER_CLASS}> </div>
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
          isShowButton={this.state.displayStyle}
          labelTitle={m => {
            let kernelName = m.kernel.name;
            if (manager.specs) {
              const spec = manager.specs.kernelspecs[kernelName];
              kernelName = spec ? spec.display_name : 'unknown';
            }
            return `Path: ${m.path}\nKernel: ${kernelName}`;
          }}
          checkedId={this.state.name}
          unbind={m => {
            const _self = this;
            sessionOpenRequested.emit(m)
            let future = manager.sessions.connectTo(m).kernel.requestExecute({code: '% quit'});
            future.done.then(() => {
              console.log('Future is fulfilled');
            });
            future.onIOPub = msg => {
              console.log(msg.content); // Print rich output data.
              let a:any = msg.content
              if (a.text && a.text.indexOf('quit successed') >  -1) {
                Toast.success('解绑成功！',2000,()=>{})
                _self.setState({
                  displayStyle: true,
                });
                _self.setState({
                  name:m.path,
                });
              }
              if (a.text && a.text.indexOf('quit fails') >  -1) {
                Toast.error('解绑失败！',2000,()=>{})
              }
            };
          }}
          bind={m => {
            const _self = this;
            let url = window.location.href;
            let baseUrl = url.indexOf('jupyter') > -1 ? url.substring(url.indexOf('jupyter'), 0) : url.substring(url.indexOf('lab'), 0)
            let hideLoading =  Toast.loading('加载中...',0, ()=>{})
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
              hideLoading()
              let dataArr = data.datasets
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
                let bindDatasets: any = [];
                for (let v in checkDataArr) {
                  let str = '';
                  let obj = {id:any,varName:any};
                  str = '("' + checkDataArr[v].varName + '", ' + checkDataArr[v].dsId + ', ' + checkDataArr[v].dataSetId + ', ' + checkDataArr[v].id + ')'
                  obj.id = checkDataArr[v].id
                  obj.varName = checkDataArr[v].varName
                  arr.push(str)
                  bindDatasets.push(obj)
                }
                let code = '% bind --task="' + getCookie('username') +'@'+ m.path + '" --sources=[' + arr.join(',') + ']'
                if (result.button.accept) {
                  sessionOpenRequested.emit(m)
                  let future = manager.sessions.connectTo(m).kernel.requestExecute({code: code});
                  future.done.then(() => {
                    console.log('Future is fulfilled');
                  });
                  future.onIOPub = msg => {
                    console.log(msg.content); // Print rich output data.
                    let a:any = msg.content
                    if (a.text && a.text.indexOf('bind successed') >  -1){
                      bindToBackend({
                        action: 'bind',
                        notebookId: getCookie('username') +'@'+ m.path,
                        datasets: bindDatasets
                      })

                      _self.setState({
                        displayStyle: false,
                      });
                      _self.setState({
                        name:m.path,
                      });

                      Toast.success('绑定成功！',2000,()=>{})
                    }
                    if (a.text && a.text.indexOf('binding fails') >  -1){
                      Toast.error('绑定失败！',2000,()=>{})
                    }
                  };
                }
              });
            })
          }}
          getBoundData={m => {
            let url = window.location.href
            let baseUrl = url.indexOf('jupyter') > -1 ? url.substring(url.indexOf('jupyter'), 0) : url.substring(url.indexOf('lab'), 0)
            let hideLoading =  Toast.loading('加载中...',0, ()=>{})
            fetch(baseUrl + 'api/binds/0?notebookId='+getCookie('username')+'@'+m.path,{
              method: 'get',
              headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'X-Request-With': 'XMLHttpRequest'
              }
            }).then(function(response:any){
              return response.json();
            }).then(function(data:any){
              hideLoading()
              let dataArr:any = data.binds
              // 定义你弹窗内部结构
              const body = (
                <ul className="bind-list-wrap n-li">
                  {dataArr.map((item:any) =>
                    <li key={item.id} className="flex align-center fb">
                      <div className="flex align-center">
                        <span>{item.key}</span>
                      </div>
                      <div>{item.varName}</div>
                    </li>
                  )}
                </ul>
              );
              // 弹窗
              void showDialog({
                title: `已选数据列表`,
                body,
                buttons: [
                  Dialog.cancelButton({ label: '关闭' }),
                ]
              }).then(result => {
                if (result.button.accept) {}
              });
            })
          }}
        />
      </>
    );
  }
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
