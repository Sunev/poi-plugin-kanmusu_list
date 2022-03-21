import React, { Component } from "react"
import { connect } from "react-redux"
import { createSelector } from "reselect"
import { Button } from "react-bootstrap"
import { store } from "views/create-store"
import { join as pathJoin } from "path-extra"
// Import selectors defined in poi, the path resolution is handled by poi
import { extensionSelectorFactory } from "views/utils/selectors"
const constShipsInfo = store.getState().const.$ships;

// 生成舰娘列表
const generateKanmusuList = (store) => {
    //console.log(store)
    let ships = store.info.ships;
    //console.log(ships)
    let groupByShipID = {};
    for (let i in ships) {
        let ship = ships[i]
        let series = getSeries(ship.api_ship_id);
        let seriesHead = series[0];
        //console.log(constShipsInfo[ship.api_ship_id],series)
        if (groupByShipID[seriesHead] == undefined) {
            groupByShipID[seriesHead] = [];
        }
        groupByShipID[seriesHead].push(ship.api_lv + "." + (series.indexOf(ship.api_ship_id) + 1))
    }
    //console.log(groupByShipID)
    let strGroupByShipID = JSON.stringify(groupByShipID, (key, value) => {
        if (Array.isArray(value)) {
            return value.sort((a, b) => { return Number(b) - Number(a) }).join(",");
        }
        return value;
    }, 4);
    strGroupByShipID = ".2|" + strGroupByShipID.replace(/\",/ig, "\"").replace(/\"/ig, "").split("\n").slice(1, -1).join("|").replace(/\s/ig, "")
    //console.log(strGroupByShipID)
    return strGroupByShipID;
}
// 获取舰娘改造序列
const getSeries = (api_ship_id) => {
    let _ship = constShipsInfo[api_ship_id];
    let shipSeries = [Number(_ship.api_id)];
    // 前溯
    let formerShip = [];
    for (let id in constShipsInfo) {
        let rawShip = constShipsInfo[id];
        if (rawShip.api_aftershipid == api_ship_id) {
            formerShip.push(id)
        }
    }
    // 前溯舰只有一艘的，直接前溯
    if (formerShip.length == 1) {
        return getSeries(formerShip.shift());
    }
    // 前溯舰超过一艘的，排除死循环后再次前溯
    if (formerShip.length > 1) {
        formerShip = formerShip.filter((id) => {
            return _ship.api_aftershipid != id;
        })
        return getSeries(formerShip.shift());
    }

    // 前溯结束，获取所有改造的 id
    while (_ship.api_aftershipid != 0
        && shipSeries.every((x) => {
            return x != _ship.api_aftershipid;
        })) {
        shipSeries.push(Number(_ship.api_aftershipid));
        _ship = constShipsInfo[_ship.api_aftershipid];
    }
    return shipSeries;
}

const setClipBoard = () => {
    let textarea = document.getElementById("kanmusu_list_textarea");
    //console.log(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
}

export const show = true


const EXTENSION_KEY = "poi-plugin-kanmusu_list"

// This selector gets store.ext["poi-plugin-kanmusu_list"]
const pluginDataSelector = createSelector(
    extensionSelectorFactory(EXTENSION_KEY),
    state => state || {},
)
// This selector gets store.ext["poi-plugin-kanmusu_list"].kanmusu_list
const clickCountSelector = createSelector(
    pluginDataSelector,
    state => state.kanmusu_list,
)

// poi will insert this reducer into the root reducer of the app
// the third parameter is the whole store of redux
export const reducer = (state = { kanmusu_list: "" }, action, store) => {
    const { type } = action
    if (type === "@@poi-plugin-kanmusu_list@click")
        return {
            // don't modify the state, use Object Spread Operator
            ...state,
            kanmusu_list: generateKanmusuList(store),
        }
    return state
}

// Action
const toGenerateKanmusuList = () => ({
    type: "@@poi-plugin-kanmusu_list@click",
})

// poi will render this component in the plugin panel
export const reactClass = connect(
    // mapStateToProps, get store.ext["poi-plugin-kanmusu_list"].kanmusu_list and set as this.props.kanmusu_list
    (state, props) => ({ kanmusu_list: clickCountSelector(state, props) }),
    // mapDispatchToProps, wrap toGenerateKanmusuList with dispatch and set as this.props.toGenerateKanmusuList
    {
        toGenerateKanmusuList,
    },
)(
    class PluginClickButton extends Component {
        render() {
            const { kanmusu_list, toGenerateKanmusuList } = this.props
            return (
                <div class='kanmusu_list'>
                    <link rel="stylesheet" href={pathJoin(__dirname, "assets", "kanmusu_list.css")}></link>
                    <textarea value={kanmusu_list} id="kanmusu_list_textarea"></textarea>
                    <Button onClick={toGenerateKanmusuList}>生成舰娘列表</Button>
                    <Button onClick={setClipBoard}>复制到剪贴板</Button>
                    <Button>
                        打开<a href="http://kancolle-calc.net/kanmusu_list.html" target="_blank">艦隊晒しページ（仮）</a>页面
                    </Button>
                </div>
            )
        }
    },
)
