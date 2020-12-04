import FacilityDesLogic from "./FacilityDesLogic";
import FacilityItemLogic from "./FacilityItemLogic";
import MapUICommand from "./MapUICommand";
import { Facility, FacilityConfig } from "./MapUIProxy";

const { ccclass, property } = cc._decorator;

@ccclass
export default class FacilityListLogic extends cc.Component {
    @property(cc.ScrollView)
    scrollView: cc.ScrollView = null;

    protected _curCityId: number = 0;
    protected _curSelectType: number = -1;
    protected _itemLogics: Map<number, FacilityItemLogic> = new Map<number, FacilityItemLogic>();

    protected onLoad(): void {
        this.initView();
        cc.systemEvent.on("update_my_facilities", this.updateView, this);
        cc.systemEvent.on("update_my_facility", this.updateFacility, this);
        cc.systemEvent.on("select_facility_item", this.onSelectItem, this);
        cc.systemEvent.on("upate_my_roleRes", this.onUpdateMyRoleRes, this);
    }

    protected onDestroy(): void {
        cc.systemEvent.targetOff(this);
        this._itemLogics.clear();
        this._itemLogics = null;
    }

    protected initView(): void {
        let children: cc.Node[] = this.scrollView.content.children;
        for (let i: number = 0; i < children.length; i++) {
            let subChildren: cc.Node[] = children[i].children;
            for (let j: number = 0; j < subChildren.length; j++) {
                let item: cc.Node = subChildren[j];
                if (item.name.indexOf("CityFacilityItem") == 0) {
                    let type: number = parseInt(item.name.substring(16));
                    let comp: FacilityItemLogic = item.addComponent(FacilityItemLogic);
                    comp.labelRate = item.getChildByName("labelRate").getComponent(cc.Label);
                    comp.labelName = item.getChildByName("labelName").getComponent(cc.Label);
                    comp.lockNode = item.getChildByName("lockNode");
                    comp.type = type;
                    this._itemLogics.set(type, comp);
                }
            }
        }
    }

    protected updateView(): void {
        let dataList: Map<number, Facility> = MapUICommand.getInstance().proxy.getMyFacilitys(this._curCityId);
        if (dataList && dataList.size > 0) {
            dataList.forEach((data: Facility, type: number) => {
                if (this._itemLogics.has(type)) {
                    //有数据就更新
                    let logic: FacilityItemLogic = this._itemLogics.get(type);
                    let cfg: FacilityConfig = MapUICommand.getInstance().proxy.getFacilityCfgByType(type);
                    let isUnlock: boolean = MapUICommand.getInstance().proxy.isFacilityUnlock(this._curCityId, type);
                    logic.setData(this._curCityId, data, cfg, isUnlock);
                }
            });
            if (this._curSelectType == -1) {
                this.setCurSelectType(0);//默认选中主城
            }
        }
    }

    protected updateFacility(cityId: number, data: Facility): void {
        if (this._curCityId == cityId) {
            if (this._itemLogics.has(data.type)) {
                //有数据就更新
                let logic: FacilityItemLogic = this._itemLogics.get(data.type);
                let cfg: FacilityConfig = MapUICommand.getInstance().proxy.getFacilityCfgByType(data.type);
                let isUnlock: boolean = MapUICommand.getInstance().proxy.isFacilityUnlock(this._curCityId, data.type);
                logic.setData(this._curCityId, data, cfg, isUnlock);
            }
            this._itemLogics.forEach((logic: FacilityItemLogic, type: number) => {
                let cfg: FacilityConfig = MapUICommand.getInstance().proxy.getFacilityCfgByType(logic.data.type);
                for (let i: number = 0; i < cfg.conditions.length; i++) {
                    if (cfg.conditions[i].type == data.type) {
                        //涉及到了解锁条件
                        let data: Facility = MapUICommand.getInstance().proxy.getMyFacilityByType(this._curCityId, logic.data.type);
                        let isUnlock: boolean = MapUICommand.getInstance().proxy.isFacilityUnlock(this._curCityId, logic.data.type);
                        logic.setData(this._curCityId, data, cfg, isUnlock);
                        break;
                    }
                }
            })
        }
    }

    protected onUpdateMyRoleRes(): void {
        this.updateDesView();
    }

    protected onSelectItem(cityId: number, type: number): void {
        if (this._curCityId == cityId) {
            this.setCurSelectType(type);
        }
    }

    protected updateDesView(): void {
        let data: Facility = MapUICommand.getInstance().proxy.getMyFacilityByType(this._curCityId, this._curSelectType);
        let cfg: FacilityConfig = MapUICommand.getInstance().proxy.getFacilityCfgByType(this._curSelectType);
        this.node.getComponent(FacilityDesLogic).setData(this._curCityId, data, cfg);
    }

    protected onClickClose(): void {
        this.node.active = false;
    }

    public setCurSelectType(type: number): void {
        if (this._curSelectType != type) {
            this._curSelectType = type;
            this.updateDesView();
        }
    }

    public setData(data: any): void {
        this._curCityId = data.cityId;
        this.updateView();
    }
}
