import React from 'react';
import { View, Image, StyleSheet, ImageStyle, StyleProp, ViewStyle } from 'react-native';

interface SantoriLogoProps {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export const SantoriLogo: React.FC<SantoriLogoProps> = ({
  width = 150,
  height = 95,
  style,
  imageStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../assets/logo_transparent.png')}
        style={[
          {
            width,
            height,
          },
          styles.image,
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
