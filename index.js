import React, { Component } from 'react'

import {
  TextInput,
  findNodeHandle,
  NativeModules,
  Platform
} from 'react-native'

const mask = NativeModules.RNTextInputMask.mask
const unmask = NativeModules.RNTextInputMask.unmask
const setMask = NativeModules.RNTextInputMask.setMask
export { mask, unmask, setMask }

export default class TextInputMask extends Component {
  static defaultProps = {
    maskDefaultValue: true,
  }

  masked = false
  precision = 0

  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value
    };
  }

  componentDidMount() {
    this.precision = this.props.precision;
    if (this.props.maskDefaultValue &&
        this.props.mask &&
        this.props.value) {
      mask(this.props.mask, '' + this.props.value, this.precision, text => {
        this.input && this.input.setNativeProps({ text }),
            this.setState({ value: text });
      })
    }

    if (this.props.mask && !this.masked) {
      this.masked = true
      setMask(findNodeHandle(this.input), this.props.mask, this.precision)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.precision !== undefined && this.precision !== nextProps.precision ) {
      this.precision = nextProps.precision;
      setMask(findNodeHandle(this.input), nextProps.mask, this.precision)
    }

    if (nextProps.mask && (this.props.value !== nextProps.value)) {
      let absValue = nextProps.value;
      let negative = false;
      if (nextProps.value && nextProps.value.indexOf('-') === 0) {
        negative = true;
        absValue = nextProps.value.substring(1);
      }
      
      let text = this._formatNumber(absValue, this.precision) || '';
      if (negative) text = `-${text}`;
      this.input && this.input.setNativeProps({ text })

      if(this.props.maxLength){	      
        if(text.length <= this.props.maxLength){	
          this.setState({ value: text });	
        }	
      }else{	
        this.setState({ value: text });	
      }
    }
  }

  _formatNumber(value, precision) {
    if (!value) {
      return value;
    }

    if(value.charAt(0) === '.'){
      return '0'
    }

    if ( parseFloat(value) === 0 && value.indexOf('.') === -1) {
      return '0'
    }

    if(value.charAt(0) === '0' && value.charAt(1) !== '.'){
      return '0'
    }

    if (value.charAt(value.length - 1) === ',') {
      value = value.substring(0, value.length -1) + '.';
    }

    let [natualPart, decimalPart = ''] = value.split('.');

    if (decimalPart.length && precision > 0) {
      decimalPart = decimalPart.substring(0, precision);
    }

    let formated = '';
    while (true) {
      if (natualPart.length > 3) {
        let digits = natualPart.substring(natualPart.length - 3);
        if (formated) {
          formated = digits + ',' + formated;
        } else {
          formated = digits;
        }
        natualPart = natualPart.substring(0, natualPart.length - 3);
      } else {
        if (formated) {
          formated = natualPart + ',' + formated;
        } else {
          formated = natualPart;
        }
        break;
      }
    }

    if (precision > 0 && value.includes('.')) {
      formated += '.';
      formated += decimalPart;
    }

    return formated;
  }

  removeLeadingZeros= (value) => {
    let result = value;
    while (true) {
      if (result.length < 2) break;

      if (result.charAt(0) === '0' && result.charAt(1) !== '.') {
        result = result.slice(1);
      } else {
        break;
      }
    }
    return result;
  }

  trimNumber= (value) => {
    const dotIndex = value.indexOf('.');
    let maxLength = this.props.maxLength;
    if (dotIndex > 0 && dotIndex < this.props.maxLength) {
      maxLength ++;
    } 
    if (dotIndex === this.props.maxLength) {
      maxLength--;
    }
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }
    return value;
  }

  standardize= (value) => {
    if (typeof value !== 'string') {
      value = value.toString();
    }

    let result = value.trim().replace(/[^0-9\.]/g, '');
    if (value.indexOf('-') === 0) {
      result = '-' + result;
    }

    const dotIndex = result.indexOf('.');
    if (dotIndex === 0) {
      result = '0' + result;
    } else if (dotIndex > 0) {
      result =  result.substring(0, dotIndex + 1) 
              + result.substring(dotIndex + 1).replace(/[\.]/g, '');
      if (this.precision > 0) {
        result = result.slice(0, dotIndex + 1 + this.precision);
      } else {
        result = result.slice(0, dotIndex);
      }
    }

    result = this.removeLeadingZeros(result);
    return this.trimNumber(result);
  }

  render() {
    const props = Object.assign({}, this.props, { value: this.state.value });
    return (<TextInput
    {...props}
    ref={ref => {
      this.input = ref
      if (typeof this.props.refInput === 'function') {
        this.props.refInput(ref)
      }
    }}
    multiline={this.props.mask && Platform.OS === 'ios' ? false : this.props.multiline}
    onChangeText={masked => {
      if (this.props.mask) {
        // let unmasked = masked.replace(/[^0-9.]/g, '');
        // unmasked = this._formatNumber(unmasked, this.precision);
        // unmasked = unmasked.replace(/[^0-9.]/g, '').slice(0, this.props.number || 16);
        let absMasked = masked;
        let negative = false;
        if (masked.indexOf('-') === 0) {
          negative = true;
          absMasked = masked.substring(1);
        }
        const standardizeValue = this.standardize(absMasked);
        const formatedValue = this._formatNumber(standardizeValue, this.precision);
       
        this.props.onChangeText && this.props.onChangeText(
          negative ? `-${formatedValue}` : formatedValue, 
          negative ? `-${standardizeValue}` : standardizeValue)
      } else {
        this.props.onChangeText && this.props.onChangeText(masked.trim())
      }
    }}
    />);
  }
}
