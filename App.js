import React, { Component } from 'react';
import { Alert, UIManager, LayoutAnimation, TextInput } from 'react-native';
import { authorize, refresh, revoke } from 'react-native-app-auth';
import { Page, Button, ButtonContainer, Form, Heading } from './components';
import {Buffer} from 'buffer';

UIManager.setLayoutAnimationEnabledExperimental &&
  UIManager.setLayoutAnimationEnabledExperimental(true);

type State = {
  hasLoggedInOnce: boolean,
  accessToken: ?string,
  accessTokenExpirationDate: ?string,
  refreshToken: ?string,
  idToken: ?string
};

const config = {
  issuer: 'https://{okta-url}.com/oauth2/default',
  clientId: '{clientId]',
  redirectUrl: '{callback}:/callback',
  responseType: 'code',
  additionalParameters: { },
  scopes: ['openid', 'profile', 'email', 'offline_access']
};

export default class App extends Component<{}, State> {
  state = {
    hasLoggedInOnce: false,
    accessToken: '',
    accessTokenExpirationDate: '',
    refreshToken: '',
    idToken: '',
    apiValues: []
  };

  base64URLEncode = (str) => {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
  }

  animateState(nextState: $Shape<State>, delay: number = 0) {
    setTimeout(() => {
      this.setState(() => {
        LayoutAnimation.easeInEaseOut();
        return nextState;
      });
    }, delay);
  }

  authorize = async () => {
    try {
      const authState = await authorize(config);
      this.animateState(
        {
          hasLoggedInOnce: true,
          accessToken: authState.accessToken,
          accessTokenExpirationDate: authState.accessTokenExpirationDate,
          refreshToken: authState.refreshToken,
          idToken: authState.idToken
        },
        500
      );
    } catch (error) {
      Alert.alert('Failed to log in', error.message);
    }
  };

  refresh = async () => {
    try {
      const authState = await refresh(config, {
        refreshToken: this.state.refreshToken
      });

      this.animateState({
        accessToken: authState.accessToken || this.state.accessToken,
        accessTokenExpirationDate:
          authState.accessTokenExpirationDate || this.state.accessTokenExpirationDate,
        refreshToken: authState.refreshToken || this.state.refreshToken,
        idToken: authState.idToken || this.state.idToken
      });
    } catch (error) {
      Alert.alert('Failed to refresh token', error.message);
    }
  };

  revoke = async () => {
    try {
      await revoke(config, {
        tokenToRevoke: this.state.accessToken,
        sendClientId: true
      });
      this.animateState({
        accessToken: '',
        accessTokenExpirationDate: '',
        refreshToken: '',
        idToken: ''
      });
    } catch (error) {
      Alert.alert('Failed to revoke token', error.message);
    }
  };

  fetchApiData = async () => {
    if (this.state.apiValues.length) {
      // reset to id token if beers is already populated
      this.animateState({apiValues: []})
    } else {
      try {
        const response = await fetch('https://chk-okta-testing-dev.azurewebsites.net/api/Values', {
          headers: {
            'Authorization': `Bearer ${this.state.accessToken}`
          }
        });
        console.log(response);
        const data = await response.json();
        this.animateState({apiValues: data});
      } catch(error) {
        Alert.alert('failed to get data from network', error.message);
      }
    }
  };

  render() {
    const {state} = this;
    if (state.idToken) {
      const jwtBody = state.idToken.split('.')[1];
      const base64 = jwtBody.replace('-', '+').replace('_', '/');
      const decodedJwt = Buffer.from(base64, 'base64');
      state.idTokenJSON = JSON.parse(decodedJwt);
    }
    return (
      <Page>
        {!!state.accessToken ? (
          <Form>
            <TextInput>{state.accessToken}</TextInput>
            <Form.Label>accessToken</Form.Label>
            <Form.Value>{state.accessToken}</Form.Value>
            <Form.Label>accessTokenExpirationDate</Form.Label>
            <Form.Value>{state.accessTokenExpirationDate}</Form.Value>
            <Form.Label>refreshToken</Form.Label>
            <Form.Value>{state.refreshToken}</Form.Value>
            <Form.Label>{!state.apiValues.length ? 'ID Token' : 'Get Api Data'}</Form.Label>
            <Form.Value>{!state.apiValues.length ? JSON.stringify(state.idTokenJSON) : state.apiValues}</Form.Value>
          </Form>
        ) : (
          <Heading>{state.hasLoggedInOnce ? 'Goodbye.' : 'Hello, stranger.'}</Heading>
        )}

        <ButtonContainer>
          {!state.accessToken && (
            <Button onPress={this.authorize} text="Authorize" color="#017CC0"/>
          )}
          {!!state.refreshToken && <Button onPress={this.refresh} text="Refresh" color="#24C2CB"/>}
          {!!state.accessToken && <Button onPress={this.revoke} text="Revoke" color="#EF525B"/>}
          {!!state.accessToken && <Button onPress={this.fetchApiData} text={!this.state.apiValues.length ? 'Get Api Data' : 'ID Token'} color="purple" />}
        </ButtonContainer>
      </Page>
    );
  }
}

