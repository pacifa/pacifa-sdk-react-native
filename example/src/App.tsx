import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Button,
  FlatList,
} from 'react-native';

import { PVenueView, PCOverrideStyle, PPanoramicView } from '@pacifa-api/react-native-components';
import { PAPI, PViewExtended, PView, PViewType } from '@pacifa-api/data';
import { useEffect } from 'react';
import { Header, Colors } from 'react-native/Libraries/NewAppScreen';
import type { Subscription } from 'rxjs';

export default function App() {
  const apiKey = 'Oj7Af-lGi5q-uYVgj';
  const apiVersion = 2;

  type DisplayedView = { view: PViewExtended; children: PView[]; style: PCOverrideStyle[] };

  const [currentView, setCurrentView] = React.useState<DisplayedView>();
  const [viewsHistory, setViewsHistory] = React.useState<DisplayedView[]>([]);
  const [cart, setCart] = React.useState<PViewExtended[]>([]);
  const [cartPreview, setCartPreview] = React.useState<PViewExtended>();

  const interactionViewRef: React.RefObject<PVenueView> = React.createRef();
  const zoomIn = () => {
    interactionViewRef?.current?.zoomIn();
  };
  const zoomOut = () => {
    interactionViewRef?.current?.zoomOut();
  };
  const panUp = () => {
    interactionViewRef?.current?.panUp();
  };
  const panDown = () => {
    interactionViewRef?.current?.panDown();
  };
  const panLeft = () => {
    interactionViewRef?.current?.panLeft();
  };
  const panRight = () => {
    interactionViewRef?.current?.panRight();
  };

  useEffect(() => {
    let invalidBlock: string[] = ['BoulogneBas', 'BoulogneHaut'];
    let papi = new PAPI(apiKey, apiVersion);
    let subscription: Subscription | null = null;
    const sub = papi.init().subscribe((_) => {
      if (papi && papi.configurations && papi.configurations.length > 0) {
        let config = papi.configurations[0];
        subscription = config.getView().subscribe(
          async (x) => {
            if (x) {
              let valid = x.excludeChildren(invalidBlock);
              //setCurrentViewChildren(valid);
              let style: PCOverrideStyle[] = [];
              if (valid && valid.length > 10)
                style = valid.slice(1, 10).map((x) => {
                  return {
                    id: x._id,
                    style: {
                      fill: 'rgba(180, 200, 12, 0.8)',
                      strokeWidth: '1',
                      strokeColor: 'black',
                    },
                  };
                });

              let currentView: DisplayedView = {
                view: x,
                children: valid,
                style: style,
              };
              setViewsHistory([...viewsHistory, currentView]);
              setCurrentView(currentView);
              console.log(currentView?.view.type);
            }
          },
          (err) => {
            console.error(err);
          }
        );
      }
    });
    return () => {
      if (subscription) subscription.unsubscribe();
      sub.unsubscribe();
    };
  }, []);

  function onItemClick(x: any) {
    console.log('onItemClick -> x', x);
    if (x._id)
      try {
        currentView?.view.getView(x._id).subscribe((x) => {
          let currentView: DisplayedView = {
            view: x,
            children: [],
            style: [],
          };
          if (x && x.type === PViewType.BLOCK) {
            let style: PCOverrideStyle[] = x.children.slice(5, 10).map((x) => {
              return {
                id: x._id,
                style: {
                  fill: 'rgba(255, 0, 255, 0.8)',
                  strokeWidth: '1',
                  strokeColor: 'black',
                },
              };
            });
            currentView.children = x.children;
            currentView.style = style;
          }

          setViewsHistory((h) => [...h, currentView]);
          setCurrentView(currentView);
        });
      } catch (error) {
        console.warn(error);
      }
  }

  function goBack() {
    if (viewsHistory.length > 1) {
      viewsHistory.pop();
      setCurrentView(viewsHistory[viewsHistory.length - 1]);
    }
  }

  function addToCart() {
    if (currentView && currentView.view && !cart.find((x) => x._id === currentView.view._id))
      setCart((c) => [...c, currentView.view]);
  }

  function removeFromCart(id: string) {
    if (cart && cart.length > 0) {
      const newCart = cart.filter((item) => item._id !== id);
      setCart(newCart);
      if (cartPreview && cartPreview._id === id) setCartPreview(undefined);
    }
  }

  function showPanoramicView(view: PViewExtended) {
    if (view) {
      setCartPreview(view);
    }
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <Header />
          <View style={styles.body}>
            <View style={styles.webViewContainer}>
              <Text>
                Current view: {currentView?.view?.type} - {currentView?.view?._id}
              </Text>

              {currentView && currentView.view && currentView.view.type !== PViewType.SEAT && (
                <>
                  <PVenueView
                    ref={interactionViewRef}
                    viewToDisplay={currentView.view}
                    itemsToDisplay={currentView.children}
                    itemGlobalStyle={{
                      fill: 'rgba(255, 255, 0, 0.4)',
                      strokeWidth: '1',
                      strokeColor: 'black',
                    }}
                    stylePerItem={currentView.style}
                    settings={{
                      loadingAnimation: {
                        enableLoadingAnimation: true,
                      },
                      onItemClick: onItemClick,
                    }}
                  />
                </>
              )}
              {currentView && currentView.view && currentView.view.type === PViewType.SEAT && (
                <>
                  <PPanoramicView
                    viewToDisplay={currentView.view}
                    menuDisplay={{
                      closedMenu: true,
                      onlyfs: false,
                    }}
                  />
                </>
              )}
            </View>

            {currentView && currentView.view && currentView.view.type !== PViewType.SEAT && (
              <View style={styles.controlsContainer}>
                <Button onPress={zoomIn} title="+" />
                <Button onPress={zoomOut} title="-" />
                <Button onPress={panUp} title="↑" />
                <Button onPress={panDown} title="↓" />
                <Button onPress={panLeft} title="←" />
                <Button onPress={panRight} title="→" />
              </View>
            )}

            <View style={styles.controlsContainer}>
              {viewsHistory && viewsHistory.length > 1 && (
                <Button
                  onPress={goBack}
                  title="Previous View"
                  color="#841584"
                  accessibilityLabel="Go back to the previous view displayed"
                />
              )}
              {currentView && currentView.view && currentView.view.type === PViewType.SEAT && (
                <Button onPress={addToCart} title="Add to cart" />
              )}
            </View>

            {cart && cart.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text>Cart</Text>
                <FlatList
                  style={styles.list}
                  data={cart}
                  keyExtractor={(_item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <View>
                      <View style={styles.listItemCont}>
                        <Text style={[styles.listItem]}>{item._id}</Text>

                        <Button title="Show" onPress={() => showPanoramicView(item)} />
                        <Button title="-" onPress={() => removeFromCart(item._id)} />
                      </View>
                      <View style={styles.hr} />
                    </View>
                  )}
                />
              </View>
            )}

            {cartPreview && cartPreview.type === PViewType.SEAT && (
              <View style={styles.webViewContainer}>
                <Text>
                  Preview : {cartPreview?.type} - {cartPreview?._id}
                </Text>
                <PPanoramicView viewToDisplay={cartPreview} />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  webViewContainer: {
    backgroundColor: Colors.pink,
    height: 200,
    margin: 20,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  controlsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 10,
    marginRight: 10,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
  list: {
    width: '100%',
  },
  listItem: {
    paddingTop: 2,
    paddingBottom: 2,
    fontSize: 18,
  },
  hr: {
    height: 1,
    backgroundColor: 'gray',
  },
  listItemCont: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
