import React from "react";
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actionCreators from '../actions/index';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Platform,
    PermissionsAndroid,
    Dimensions
} from "react-native";
import MapView, {
    Marker,
    AnimatedRegion,
    Polyline,
    PROVIDER_GOOGLE
} from "react-native-maps";
import Text from '../config/AppText';
import haversine from "haversine";
import {
    Item,
    Input,
    InputGroup,
    Icon
} from "native-base";
import styles from "../styles";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import RNGooglePlaces from 'react-native-google-places';
import AutoComplete from "./AutoComplete";
import MapContainer from "./MapContainer";
import MapSearch from "./MapSearch";
import SearchResult from "./SearchResults";

const homePlace = { description: 'Home', geometry: { location: { lat: 48.8152937, lng: 2.4597668 } } };
const workPlace = { description: 'Work', geometry: { location: { lat: 48.8496818, lng: 2.2940881 } } };

// const LATITUDE = 29.95539;
// const LONGITUDE = 78.07513;
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;

class RiderLocation extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            inputTxt: false,
            latitude: LATITUDE,
            longitude: LONGITUDE,
            routeCoordinates: [],
            distanceTravelled: 0,
            prevLatLng: {},
            coordinate: new AnimatedRegion({
                latitude: this.props.home.location.coords.latitude || 0,
                longitude: this.props.home.location.coords.longitude || 0,
                latitudeDelta: 0,
                longitudeDelta: 0
            })
        };
    }

    componentDidMount() {
        this.props.getCurrentLocation();
        const { coordinate } = this.state;
        this.requestCameraPermission();

        this.watchID = navigator.geolocation.watchPosition(
            position => {
                const { routeCoordinates, distanceTravelled } = this.state;
                const { latitude, longitude } = position.coords;

                const newCoordinate = {
                    latitude,
                    longitude
                };
                console.log({ newCoordinate });

                if (Platform.OS === "android") {
                    if (this.marker) {
                        this.marker._component.animateMarkerToCoordinate(
                            newCoordinate,
                            500
                        );
                    }
                } else {
                    coordinate.timing(newCoordinate).start();
                }

                this.setState({
                    latitude,
                    longitude,
                    routeCoordinates: routeCoordinates.concat([newCoordinate]),
                    distanceTravelled:
                        distanceTravelled + this.calcDistance(newCoordinate),
                    prevLatLng: newCoordinate
                });
            },
            error => console.log(error),
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 1000,
                distanceFilter: 10
            }
        );
    }

    componentWillUnmount() {
        navigator.geolocation.clearWatch(this.watchID);
    }

    toggleSearchModal = () => {
        this.setState({ inputTxt: true })
    }

    openSearchModal = () => {
        RNGooglePlaces.openAutocompleteModal({
            initialQuery: 'vestar',
            locationRestriction: {
                latitudeSW: 6.3670553,
                longitudeSW: 2.7062895,
                latitudeNE: 6.6967964,
                longitudeNE: 4.351055
            },
            country: 'NG',
            type: 'establishment'
        }, ['placeID', 'location', 'name', 'address', 'types', 'openingHours', 'plusCode', 'rating', 'userRatingsTotal', 'viewport']
        )
            .then((place) => {
                console.log(place);
            })
            .catch(error => console.log(error.message));
    }

    getMapRegion = () => ({
        latitude: this.props.home.location.coords.latitude || 0,
        longitude: this.props.home.location.coords.longitude || 0,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA
    });

    calcDistance = newLatLng => {
        const { prevLatLng } = this.state;
        return haversine(prevLatLng, newLatLng) || 0;
    };

    requestCameraPermission = async () => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                    title: "Location Access Permission",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log("You can use the camera");
            } else {
                console.log("Camera permission denied");
            }
        } catch (err) {
            console.warn(err);
        }
    };

    render() {
        const width = Dimensions.get('screen').width;
        // const searchBarStyle = StyleSheet.flatten([styles.searchBar, {
        //     top: 80,
        //     width: width - 30,
        //     elevation: 5
        // }])
        return (
            <View style={{ flex: 1 }}>
                {/* {this.state.inputTxt ? <AutoComplete /> : null} */}
                {/* <GooglePlacesAutocomplete
                    placeholder='Enter Location'
                    minLength={2}
                    autoFocus={false}
                    returnKeyType={'default'}
                    fetchDetails={true}
                    styles={{
                        textInputContainer: {
                            backgroundColor: 'rgba(0,0,0,0)',
                            borderTopWidth: 0,
                            borderBottomWidth: 0
                        },
                        textInput: {
                            marginLeft: 0,
                            marginRight: 0,
                            height: 38,
                            color: '#5d5d5d',
                            fontSize: 16
                        },
                        predefinedPlacesDescription: {
                            color: '#1faadb'
                        },
                    }}
                    currentLocation={false}
                /> */}

                {!this.props.home.toggle ? <View style={{ flex: 1 }}>
                    <MapContainer
                        region={this.getMapRegion()}
                        routeCoordinates={this.state.routeCoordinates}
                        coordinate={this.state.coordinate}
                        selectedAddress={this.props.home.selectedAddress}
                    />
                    <MapSearch
                        toggleSearchModal={this.props.toggleSearchModal}
                    />
                </View> : <SearchResult
                        inputData={this.props.home.inputData}
                        resultTypes={this.props.home.resultTypes}
                        predictions={this.props.home.predictions}
                        getAddressPredictions={this.props.getAddressPredictions}
                        getInputData={this.props.getInputData}
                        closeToggleModal={this.props.closeToggleModal}
                        searching={this.props.home.searching}
                        error={this.props.home.error}
                    />}
            </View>
        );
    }
}

const mapStateToProps = state => ({
    home: state.home
});

const mapDispatchToProps = dispatch => bindActionCreators(actionCreators, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(RiderLocation);