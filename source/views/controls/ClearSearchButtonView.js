import { Class } from '../../core/Core';
import ButtonView from './ButtonView';

const ClearSearchButtonView = Class({

    Extends: ButtonView,

    className: 'v-ClearSearchButton',
    layout: {
        position: 'absolute',
    },
    shortcut: 'Ctrl-/',
});

export default ClearSearchButtonView;
