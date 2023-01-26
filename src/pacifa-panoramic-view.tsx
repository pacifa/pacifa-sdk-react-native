import type { StyleProp } from 'react-native';
import { PViewExtended, PViewSrcType } from '@pacifa-api/data';
import { Component } from 'react';
import React from 'react';
import { WebView } from 'react-native-webview';
export type PPanoramicViewProps = {} & DefaultProps;

type DefaultProps = {
  containerStyle: StyleProp<any>;
  viewToDisplay: PViewExtended;
  menuDisplay: {
    onlyfs?: boolean;
    closedMenu?: boolean;
  };
};

export type PPanoramicViewState = {};

export class PPanoramicView extends Component<PPanoramicViewProps, PPanoramicViewState> {
  private wvRef: React.RefObject<WebView> = React.createRef();

  static defaultProps: Partial<PPanoramicViewProps> = {
    containerStyle: {},
    viewToDisplay: undefined,
    menuDisplay: {
      onlyfs: false,
      closedMenu: false,
    },
  };

  constructor(props: PPanoramicViewProps) {
    super(props);
    this.state = {};
  }

  componentDidMount() {}

  render() {
    const { containerStyle, viewToDisplay, menuDisplay } = this.props;
    let source: any = {};
    if (viewToDisplay) {
      const panoUrl = viewToDisplay.src.find((x) => x.type === PViewSrcType.PANO);
      if (panoUrl && panoUrl.url) {
        source.uri = panoUrl.url;

        const params =
          (menuDisplay.onlyfs ? '&onlyfs=true' : '') + (menuDisplay.closedMenu ? '&m=0' : '');
        if (params) {
          if (source.uri.includes('?')) {
            source.uri += params;
          } else {
            source.uri += '?' + params.slice(1);
          }
        }
      } else {
        console.warn('No PViewSrcType.PANO found in the view.src');
      }
    }
    if (source.uri?.match(/\.xml(\?.*)?$/)) {
      const krpanoCode =
        `
            <html>
            <head>
                <title>PACIFA decision</title>
                <meta name="viewport"
                    content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black" />
                <meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
                <meta http-equiv="x-ua-compatible" content="IE=edge" />
                <style>
                    @-ms-viewport {
                        width: device-width;
                    }

                    @media only screen and (min-device-width:800px) {
                        html {
                            overflow: hidden;
                        }
                    }

                    html {
                        height: 100%;
                    }

                    body {
                        height: 100%;
                        overflow: hidden;
                        margin: 0;
                        padding: 0;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 16px;
                        color: #FFFFFF;
                        background-color: #000000;
                    }
                </style>
                </head>
                    <body>
                    <div id="pano">
                    <noscript>
                    <table style="width:100%;height:100%;">
                    <tr style="vertical-align:middle;">
                    <td>
                    <div style="text-align:center;">ERROR:<br /><br />Javascript not activated<br /><br /></div>
                    </td>
                    </tr>
                    </table>
                    </noscript>
                    <script type="text/javascript">
                    let panoConfig = "` +
        source.uri +
        `";
                    
                    function loadPano(){
                        embedpano({
                            swf: "",
                            xml: panoConfig,
                            target: "pano",
                            html5: "only",
                            mobilescale: 1.0,
                            passQueryParameters: true
                        });
                    }
                    function reqListener () {
                        console.log(this);
                        console.log(this.responseText);
                    }
                    </script>
                    <script type="text/javascript" src="https://pacifa-assets.s3-eu-west-1.amazonaws.com/pacifaprod/vtour/_default/tour.js" onload="loadPano();"></script>
                    </div>
                </body>
            </html>
            `;
      return (
        <WebView
          ref={this.wvRef}
          style={containerStyle}
          scalesPageToFit={false}
          originWhitelist={['*']}
          incognito={true}
          cacheEnabled={false}
          cacheMode={'LOAD_NO_CACHE'}
          javaScriptEnabled={true}
          source={{ html: krpanoCode }}
        />
      );
    }
    return (
      <WebView
        ref={this.wvRef}
        style={containerStyle}
        scalesPageToFit={false}
        originWhitelist={['*']}
        incognito={true}
        cacheEnabled={false}
        cacheMode={'LOAD_NO_CACHE'}
        javaScriptEnabled={true}
        source={source}
      />
    );
  }
}
