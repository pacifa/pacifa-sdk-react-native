import type { StyleProp } from 'react-native';
import { PView, PViewExtended, PViewSrcType, PViewSrcSubtype, PViewSrc } from '@pacifa-api/data';
import { Component } from 'react';
import type { PCItemStyle } from './models/pc-item-style';
import type { PCOverrideStyle } from './models/pc-override-style';
import type { PCVVSettings } from './models/pc-vv-settings';
import React from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { PCVVSettingsLoadingAnimation } from './models/pc-vv-settings-animation';
var defaultsDeep = require('lodash.defaultsdeep');

export type Props = {} & DefaultProps;

type DefaultProps = {
  containerStyle: StyleProp<any>;
  viewToDisplay: PViewExtended;
  itemsToDisplay: PView[];
  stylePerItem?: PCOverrideStyle[];
  itemGlobalStyle: PCItemStyle;
  settings?: PCVVSettings;
};

export type State = {};

export class PVenueView extends Component<Props, State> {
  private readonly SVG_ID: string = 'svg-container';
  private wvRef: React.RefObject<WebView> = React.createRef();
  private itemsId: string[] = [];
  private styleToApply: Array<{
    idStyle?: string | string[];
    style?: PCItemStyle;
    globalStyle?: PCItemStyle;
    itemsStyle?: PCOverrideStyle[];
  }> = [];
  private _svgLoaded: boolean = false;
  public get svgLoaded() {
    return this._svgLoaded;
  }

  static defaultProps: Partial<Props> = {
    containerStyle: {},
    itemGlobalStyle: {
      fill: 'rgba(255, 255, 255, 0.4)',
      strokeWidth: '1',
      strokeColor: 'black',
    },
    viewToDisplay: undefined,
    itemsToDisplay: [],
    stylePerItem: [],
    settings: {
      panOffset: 50,
      zoomOffset: 1.2,
      loadingAnimation: {
        enableLoadingAnimation: true,
        timeLoadingAnimation: 2000,
        delayBeforeStarting: 2000,
      },
      noBorder: true,
      onItemClick: () => {},
    },
  };

  constructor(props: Props) {
    super(defaultsDeep(props, PVenueView.defaultProps));
    this.state = {};
  }

  componentDidMount() {}

  render() {
    const {
      containerStyle,
      itemGlobalStyle,
      viewToDisplay,
      itemsToDisplay,
      stylePerItem,
      settings,
    } = defaultsDeep(this.props, PVenueView.defaultProps);
    let polygons: string = this.polygonAreasFromView(itemsToDisplay, itemGlobalStyle, stylePerItem);
    let svg = this.updateSVGView(viewToDisplay, polygons, settings?.loadingAnimation);
    let scripts = this.getScriptsToInject(viewToDisplay, this.SVG_ID, settings);
    let html = this.includeInBaseHTMLTemplate(svg, scripts);

    return (
      <WebView
        nativeID="WebView"
        ref={this.wvRef}
        style={containerStyle}
        scalesPageToFit={false}
        originWhitelist={['*']}
        incognito={true}
        cacheEnabled={false}
        cacheMode={'LOAD_NO_CACHE'}
        javaScriptEnabled={true}
        source={{ html }}
        onMessage={(evt: WebViewMessageEvent) => this.webview_onMessage(evt)}
      />
    );
  }

  private webview_onMessage(event: WebViewMessageEvent) {
    if (event && event.nativeEvent && event.nativeEvent.data) {
      let dat = JSON.parse(event.nativeEvent.data);
      if (dat.svg_loaded) {
        this._svgLoaded = true;
        let d:
          | {
              idStyle?: string | string[];
              style?: PCItemStyle;
              globalStyle?: PCItemStyle;
              itemsStyle?: PCOverrideStyle[];
            }
          | undefined;
        while ((d = this.styleToApply.shift())) {
          if (d.style) this.setIdStyle(d.idStyle || '', d.style);
          else this.setStyle(d.globalStyle || {}, d.itemsStyle);
        }
        this.props?.settings?.onSVGLoaded?.();
      }

      if (dat._id) {
        this.props?.settings?.onItemClick?.(dat);
      }

      if (dat.event) {
        this.props?.settings?.onEvent?.(dat);
      }
    }
  }

  private polygonAreasFromView(
    areas: PView[],
    globalStyle: PCItemStyle,
    itemsStyle?: PCOverrideStyle[]
  ): string {
    let polygons: string[] = [];
    let iId: string[] = [];
    for (let i = 0; i < areas.length; i++) {
      const c = areas[i];
      iId.push(c._id);

      const customStyle = itemsStyle?.find((x) => x.id === c._id);
      let fill = customStyle?.style?.fill || globalStyle?.fill || '';
      let strokeWidth = customStyle?.style?.strokeWidth || globalStyle?.strokeWidth || 0;
      let strokeColor = customStyle?.style?.strokeColor || globalStyle?.strokeColor || '';

      polygons.push(
        `<polygon id="${c._id}" onclick="sendData({_id:'${c._id}'})" points="${c.coords}" style="fill: ${fill}; stroke: ${strokeColor}; stroke-width: ${strokeWidth}"></polygon>`
      );
    }
    this.itemsId = iId;
    return polygons.join('');
  }

  private updateSVGView(
    parent: PViewExtended,
    polygons: string,
    animationSetting?: PCVVSettingsLoadingAnimation
  ): string {
    if (!parent || !parent.src) return '';
    const backgroundImg: PViewSrc | undefined = parent.src.find(
      (x) => x.type === PViewSrcType.IMAGE && x.sub_type === PViewSrcSubtype.DEFAULT
    );
    const backgroundImgLoading: PViewSrc | undefined = parent.src.find(
      (x) => x.type === PViewSrcType.IMAGE && x.sub_type === PViewSrcSubtype.LOAD
    );

    let svg: string = `
        <svg  id="${this.SVG_ID}" version="1.1"
            onresize="if(updateMinZoom)updateMinZoom();"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            xmlns:ev="http://www.w3.org/2001/xml-events"
            onload="sendData({svg_loaded:true})" >
            <g class="svg-pan-zoom_viewport">
                <image href="${backgroundImg?.url}" x="0" y="0" height="${
      backgroundImg?.height
    }" width="${backgroundImg?.width}" />
                <g id="svg-content">
                    ${polygons}
                </g>
                ${
                  backgroundImgLoading &&
                  backgroundImgLoading?.url &&
                  animationSetting &&
                  animationSetting.enableLoadingAnimation
                    ? `<image id="loading-img" href="${backgroundImgLoading?.url}" x="0" y="0" height="${backgroundImgLoading?.height}" width="${backgroundImgLoading?.width}" />`
                    : ''
                }

            </g>
        </svg>

        `;
    return svg;
  }

  private includeInBaseHTMLTemplate(content: string, scripts: string) {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Pacifa SVG</title>
                <style>
                    html,
                    body {
                        width: 100%;
                        height: 100%;
                        border: none;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                        background-color: black;
                    }
                    svg {
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        touch-action: none;
                        user-select: none;
                        -webkit-user-drag: none;
                        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
                    }
                </style>
            </head>
            <body>
                ${content}
                ${scripts}
            </body>
        </html>
        `;
  }

  private getScriptsToInject(
    parent: PViewExtended,
    svgID: string,
    settings?: PCVVSettings
  ): string {
    const backgroundImg: PViewSrc | undefined = parent.src.find(
      (x) => x.type === PViewSrcType.IMAGE && x.sub_type === PViewSrcSubtype.DEFAULT
    );
    return `
        <script>
            if (!(window.fetch && window.Promise && [].includes && Object.assign && window.Map)) {
                document.write('<script src="https://cdn.polyfill.io/v2/polyfill.min.js?features=default,fetch"></'+'script>');
            }
        </script>
        <script src="https://pacifa-assets.s3.amazonaws.com/wims/v2/js/libs/svg-pan-zoom.min.js"></script>
        <script src="https://pacifa-assets.s3.amazonaws.com/wims/v2/js/libs/hammer.min.js"></script>
        <script>
            let pan_offset = ${settings && settings.panOffset ? settings?.panOffset : 0};
            let zoom_offset = ${settings && settings.zoomOffset ? settings?.zoomOffset : 0};

            let panZoomSVG = null;
            let minZoom = 1;
            let hammer = null;

            let noBorder = ${this.props?.settings?.noBorder ? 'true' : 'false'};

            function updateMinZoom(){
                const svg = document.getElementById("${svgID}");
                let ih = ${backgroundImg?.height} ? ${backgroundImg?.height} : svg.clientHeight;
                let iw = ${backgroundImg?.width} ? ${backgroundImg?.width} : svg.clientWidth;
                let svgRatio = ih / iw;
                let imgRatio = svg.clientHeight / svg.clientWidth;
                if(svgRatio !== imgRatio){
                    if(svgRatio < imgRatio){
                        minZoom = imgRatio/svgRatio;
                    }else{
                        minZoom = svgRatio/imgRatio;
                    }
                    if(!noBorder)
                        minZoom = 1/minZoom;
                }else
                    minZoom = 1;
                if(panZoomSVG)
                    panZoomSVG.setMinZoom(minZoom);
            }

            function InitMobileControls(svgID) {

                let beforePan = (oldPan, newPan) => {
                    var customPan = {},
                        sizes = panZoomSVG.getSizes(),
                        left = -(sizes.viewBox.width * sizes.realZoom - sizes.width),
                        right = 0,
                        top = -(sizes.viewBox.height * sizes.realZoom - sizes.height),
                        bottom = 0;
                    if (sizes.viewBox.width * sizes.realZoom > sizes.width) {
                        if (newPan.x < left) customPan.x = left;
                        if (newPan.x > right) customPan.x = right;
                    } else {
                        customPan.x = (sizes.width - sizes.viewBox.width * sizes.realZoom) / 2;
                    }
                    if (sizes.viewBox.height * sizes.realZoom > sizes.height) {
                        if (newPan.y < top) customPan.y = top;
                        if (newPan.y > bottom) customPan.y = bottom;
                    } else {
                        customPan.y = (sizes.height - sizes.viewBox.height * sizes.realZoom) / 2;
                    }
                    return customPan;
                }
                var eventHammerHandler = {
                    haltEventListeners: ["touchstart", "touchend", "touchmove", "touchleave", "touchcancel"]
                    , init: (options) => {
                        var instance = options.instance
                            , initialScale = 1
                            , pannedX = 0
                            , pannedY = 0
                        // Init Hammer
                        // Listen only for pointer and touch events
                        hammer = Hammer(options.svgElement, {
                            inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput
                        })
                        // Enable pinch
                        hammer.get("pinch").set({ enable: true })
                        // Handle double tap
                        hammer.on("doubletap", (ev) => {
                            instance.zoomIn()
                            sendData({event: "doubletap"});
                        })
                        // Handle pan
                        hammer.on("panstart panmove", (ev) => {
                            // On pan start reset panned variables
                            if (ev.type === "panstart") {
                                pannedX = 0
                                pannedY = 0
                            }
                            // Pan only the difference
                            instance.panBy({ x: ev.deltaX - pannedX, y: ev.deltaY - pannedY })
                            pannedX = ev.deltaX
                            pannedY = ev.deltaY
                            sendData({event: "pan"});
                        })
                        // Handle pinch
                        hammer.on("pinchstart pinchmove", (ev) => {
                            // On pinch start remember initial zoom
                            if (ev.type === "pinchstart") {
                                initialScale = instance.getZoom()
                                instance.zoomAtPoint(initialScale * ev.scale, { x: ev.center.x, y: ev.center.y })
                            }
                            instance.zoomAtPoint(initialScale * ev.scale, { x: ev.center.x, y: ev.center.y })
                            sendData({event: "pinch"});
                        })
                        // Prevent moving the page on some devices when panning over SVG
                        options.svgElement.addEventListener("touchmove", (e) => { e.preventDefault(); });
                    }
                    , destroy: () => {
                        hammer.destroy()
                    }
                };

                let svg = document.getElementById(svgID);

                panZoomSVG = svgPanZoom(svg, {
                    panEnabled: true,
                    controlIconsEnabled: false,
                    zoomEnabled: true,
                    preventMouseEventsDefault: true,
                    zoomScaleSensitivity: 0.1,
                    minZoom: minZoom,
                    maxZoom: 5,
                    center: false,
                    fit: true,
                    beforePan: beforePan,
                    customEventsHandler: eventHammerHandler
                });

                function updateSvgLibraryOnResizeHandler() {
                    if (!panZoomSVG)
                        return;
                    panZoomSVG.updateBBox();
                    panZoomSVG.resize();
                    panZoomSVG.fit();
                    panZoomSVG.center();
                }

                window.addEventListener("resize",
                    updateSvgLibraryOnResizeHandler.bind(this)
                );
                window.dispatchEvent(new Event("resize"));
            }
            function AnimatedZoom(e, t) {
                if (!panZoomSVG)
                    return;
                var r = this
                    , n = 0
                    , o = null
                    , i = (t - 1) / 20;
                o = setInterval((function() {
                    n++ < 20 ? panZoomSVG.zoomBy(e ? 1 + i : 1 / (1 + i)) : clearInterval(o)
                }
                ), 15)
            }
            function ZoomIn() {
                AnimatedZoom(!0, zoom_offset);
            }
            function ZoomOut() {
                AnimatedZoom(!1, zoom_offset);
            }
            function AnimatedPanBy(e) {
                if (!panZoomSVG)
                    return;
                var t = this
                    , r = 0
                    , n = null
                    , o = e.x / 20
                    , i = e.y / 20;
                n = setInterval((function() {
                    r++ < 20 ? panZoomSVG.panBy({
                        x: o,
                        y: i
                    }) : clearInterval(n)
                }
                ), 15)
            }
            function PanUp() {
                AnimatedPanBy({x:0, y:pan_offset});
            }
            function PanDown() {
                AnimatedPanBy({x:0, y:-pan_offset});
            }
            function PanLeft() {
                AnimatedPanBy({x:pan_offset, y:0});
            }
            function PanRight() {
                AnimatedPanBy({x:-pan_offset, y:0});
            }

            function sendData(data) {
                if (data && window && window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(data));
                }
            }

            function fadeOut(el, time) {
                el.style.opacity = 1;
                el.style.display = "block";

                var last = +new Date();
                var tick = function() {
                    el.style.opacity = +el.style.opacity - (new Date() - last) / time;
                    last = +new Date();

                    if (+el.style.opacity > 0) {
                        (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16)
                    }else {
                            el.style.display = "none";
                    }
                };

                tick();
            }



            document.getElementById("${svgID}").addEventListener("load", function(){
                InitMobileControls("${svgID}");

                var imageLoading = document.getElementById('loading-img');
                if(imageLoading){

                ${
                  settings &&
                  settings?.loadingAnimation &&
                  settings?.loadingAnimation?.timeLoadingAnimation &&
                  settings?.loadingAnimation?.delayBeforeStarting
                    ? ` setTimeout(function() {
                        fadeOut(imageLoading, ${settings?.loadingAnimation?.timeLoadingAnimation});
                    }, ${settings?.loadingAnimation?.delayBeforeStarting});`
                    : ''
                }


                }
            });
        </script>
        `;
  }

  public zoomIn() {
    this.wvRef?.current?.injectJavaScript('ZoomIn();');
  }
  public zoomOut() {
    this.wvRef?.current?.injectJavaScript('ZoomOut();');
  }
  public panUp() {
    this.wvRef?.current?.injectJavaScript('PanUp();');
  }
  public panDown() {
    this.wvRef?.current?.injectJavaScript('PanDown();');
  }
  public panLeft() {
    this.wvRef?.current?.injectJavaScript('PanLeft();');
  }
  public panRight() {
    this.wvRef?.current?.injectJavaScript('PanRight();');
  }
  private replaceElementStyle(id: string, fill: string, strokeWidth: string, strokeColor: string) {
    this.wvRef?.current?.injectJavaScript(`
        (() => {
            let svg = document.getElementById("${this.SVG_ID}").childNodes[1].childNodes[3].childNodes;
            for(let i = svg.length; i--;)if(!svg[i] || !svg[i].attributes || !svg[i].attributes.id || svg[i].attributes.id.value !== "${id}" || !svg[i].attributes.style) continue; else (svg[i].attributes.style.value = "fill: ${fill}; stroke: ${strokeColor}; stroke-width: ${strokeWidth}");
        })();
    `);
  }
  /**
   * Set style without redraw all elements
   *
   * @param {PCItemStyle} globalStyle Default style to apply
   * @param {PCOverrideStyle[]} [itemsStyle] Specifique style to apply for specified id
   * @memberof PVenueView
   */
  public setStyle(globalStyle: PCItemStyle, itemsStyle?: PCOverrideStyle[]) {
    if (!this.svgLoaded) {
      this.styleToApply.push({ globalStyle, itemsStyle });
      return;
    }
    let c: string;
    for (let i = 0; i < this.itemsId.length; i++) {
      c = this.itemsId[i];

      const customStyle = itemsStyle?.find((x) => x.id === c);
      let fill = customStyle?.style?.fill || globalStyle?.fill || '';
      let strokeWidth = customStyle?.style?.strokeWidth || globalStyle?.strokeWidth || '0';
      let strokeColor = customStyle?.style?.strokeColor || globalStyle?.strokeColor || '';

      this.replaceElementStyle(c, fill, strokeWidth, strokeColor);
    }
  }
  /**
   * Set style without redraw of specified elements
   *
   * @param {(string|string[])} idStyle id or array of id
   * @param {PCItemStyle} style style to apply
   * @memberof PVenueView
   */
  public setIdStyle(idStyle: string | string[], style: PCItemStyle) {
    if (!this.svgLoaded) {
      this.styleToApply.push({ idStyle, style });
      return;
    }
    if (!Array.isArray(idStyle)) idStyle = [idStyle];
    let c: string;
    for (let i = 0; i < idStyle.length; i++) {
      c = idStyle[i];

      this.replaceElementStyle(
        c,
        style.fill || '',
        style.strokeWidth || '0',
        style.strokeColor || ''
      );
    }
  }
}
