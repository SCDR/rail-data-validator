import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './dataCollect.less';
import { Affix, Alert, Button, Card, Col, Descriptions, Flex, Form, Input, InputNumber, Popover, Result, Row, Skeleton, Space, Steps, Tag, Tooltip } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { ExclamationCircleOutlined, UpCircleOutlined } from '@ant-design/icons';
import { ColumnType, DataRow } from '@/components/Validation/types';
import RailDataValidator, { RailDataValidatorHandle } from './dataValidator';

const NoFoundPage: React.FC = () => {
    const straightValidatorRef = useRef<RailDataValidatorHandle | null>(null);
    const curvedValidatorRef = useRef<RailDataValidatorHandle | null>(null);
    const lastValidationContextRef = useRef<{ type: 'rail' | 'horizontal' | 'all', section: 'straight' | 'curved', changedKeys?: string[] } | null>(null);
    const changedFieldsRef = useRef({
        straightGauge: new Set<string>(),
        straightHorizontal: new Set<string>(),
        curvedGauge: new Set<string>(),
        curvedHorizontal: new Set<string>(),
    });
    const debounceTimerRef = useRef<number | null>(null);
    const queueFieldValidation = (section: 'straightGauge' | 'straightHorizontal' | 'curvedGauge' | 'curvedHorizontal', field: string) => {
        changedFieldsRef.current[section].add(field);
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(async () => {
            const ref = (currentStep === 0 ? straightValidatorRef.current : curvedValidatorRef.current);
            if (!ref) return;
            const ctx = section.includes('Gauge')
                ? { type: 'rail' as const, section: currentStep === 0 ? 'straight' as const : 'curved' as const, changedKeys: Array.from(changedFieldsRef.current[section]) }
                : { type: 'horizontal' as const, section: currentStep === 0 ? 'straight' as const : 'curved' as const, changedKeys: Array.from(changedFieldsRef.current[section]) };
            lastValidationContextRef.current = ctx;
            try {
                if (ctx.type === 'rail') {
                    await ref.validateRailData();
                } else {
                    await ref.validateHorizontalData();
                }
            } catch (e) {
                console.error('校验失败:', e);
            } finally {
                changedFieldsRef.current[section].clear();
            }
        }, 400);
    };

    // 会话存储键（与数据采集页保持一致）
    const STORAGE_KEYS = {
        straightGauge: 'dataCollect_straight_gauge',
        straightHorizontal: 'dataCollect_straight_horizontal',
        curvedGauge: 'dataCollect_curved_gauge',
        curvedHorizontal: 'dataCollect_curved_horizontal',
    } as const;

    // 简单值清洗：去除前后空格、限制长度、防止注入
    const sanitizeValue = (val: any) => {
        try {
            if (typeof val !== 'string') return '';
            const trimmed = val.trim();
            if (trimmed.length > 100) return trimmed.slice(0, 100);
            if (/[<>]/.test(trimmed)) return trimmed.replace(/[<>]/g, '');
            return trimmed;
        } catch {
            return '';
        }
    };

    const straightGaugeColumnTypes = [
        { name: 'ExtraCol1', label: '额外列1', hidden: false },
        { name: 'ExtraCol2', label: '额外列2', hidden: false },
        { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
        { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
        { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
        { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
        { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
        { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
        { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
        { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
        { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
        { name: 'FrogRearCol', label: '辙岔后', hidden: false },
        { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
        { name: 'GuardDistanceCol', label: '护背距离', hidden: false }
    ];
    const straightHorizontalColumnTypes = [
        { name: 'ExtraCol1', label: '额外列1', hidden: true },
        { name: 'ExtraCol2', label: '额外列2', hidden: true },
        { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
        { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
        { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
        { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
        { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
        { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
        { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
        { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
        { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
        { name: 'FrogRearCol', label: '辙岔后', hidden: false },
        { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
        { name: 'GuardDistanceCol', label: '护背距离', hidden: false }
    ];

    const curvedGaugeColumnTypes = [
        { name: 'ExtraCol1', label: '额外列1', hidden: false },
        { name: 'ExtraCol2', label: '额外列2', hidden: false },
        { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
        { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
        { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
        { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
        { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
        { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
        { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
        { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
        { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
        { name: 'FrogRearCol', label: '辙岔后', hidden: false },
        { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
        { name: 'GuardDistanceCol', label: '护背距离', hidden: false }
    ];
    const curvedHorizontalColumnTypes = [
        { name: 'ExtraCol1', label: '额外列1', hidden: true },
        { name: 'ExtraCol2', label: '额外列2', hidden: true },
        { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
        { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
        { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
        { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
        { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
        { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
        { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
        { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
        { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
        { name: 'FrogRearCol', label: '辙岔后', hidden: false },
        { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
        { name: 'GuardDistanceCol', label: '护背距离', hidden: false }
    ];


    const [straightForm] = Form.useForm();
    const [curvedForm] = Form.useForm();
    interface FormData {
        gauge: {
            [key: string]: string | undefined;
        };
        horizontal: {
            [key: string]: string | undefined;
        };
    }
    interface RailDataValidatorProps {
        railData: DataRow[];
        horizontalData: DataRow[];
        railsColumns: ColumnType[];
        horizontalColumns: ColumnType[];
    }

    const [straightRailFormData, setStraightRailFormData] = useState<FormData>(() => {
        const initValues: { [key: string]: string } = {};
        straightGaugeColumnTypes.forEach(col => {
            initValues[col.name] = ''; // 初始化所有字段为空字符串
        });

        return {
            gauge: initValues, // 确保所有列名都有初始值
            horizontal: {}
        };
    });

    const [curvedRailFormData, setCurvedRailFormData] = useState<FormData>(() => {
        const initValues: { [key: string]: string } = {};
        curvedGaugeColumnTypes.forEach(col => {
            initValues[col.name] = ''; // 初始化所有字段为空字符串
        });

        return {
            gauge: initValues, // 确保所有列名都有初始值
            horizontal: {}
        };
    });

    // 存储加载状态
    const [storageStatus, setStorageStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [storageError, setStorageError] = useState<string | null>(null);

    // 会话数据加载
    useEffect(() => {
        setStorageStatus('loading');
        try {
            if (typeof window === 'undefined') {
                setStorageStatus('error');
                setStorageError('window 未定义，无法访问 sessionStorage');
                return;
            }
            const sg = sessionStorage.getItem(STORAGE_KEYS.straightGauge);
            const sh = sessionStorage.getItem(STORAGE_KEYS.straightHorizontal);
            const cg = sessionStorage.getItem(STORAGE_KEYS.curvedGauge);
            const ch = sessionStorage.getItem(STORAGE_KEYS.curvedHorizontal);

            if (sg) {
                const parsed = JSON.parse(sg) as Record<string, string>;
                const sanitized = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]));
                setStraightRailFormData(prev => ({ ...prev, gauge: sanitized }));
            }
            if (sh) {
                const parsed = JSON.parse(sh) as Record<string, string>;
                const sanitized = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]));
                setStraightRailFormData(prev => ({ ...prev, horizontal: sanitized }));
            }
            if (cg) {
                const parsed = JSON.parse(cg) as Record<string, string>;
                const sanitized = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]));
                setCurvedRailFormData(prev => ({ ...prev, gauge: sanitized }));
            }
            if (ch) {
                const parsed = JSON.parse(ch) as Record<string, string>;
                const sanitized = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, sanitizeValue(v)]));
                setCurvedRailFormData(prev => ({ ...prev, horizontal: sanitized }));
            }

            setStorageStatus('success');
            setStorageError(null);
        } catch (e: any) {
            setStorageStatus('error');
            setStorageError(e?.message || '会话数据加载失败');
            console.error(e);
        }
    }, []);

    // 分别跟踪轨距和水平的完成状态
    const [isRailsComplete, setIsRailsComplete] = useState(false);
    const [isHorizontalComplete, setIsHorizontalComplete] = useState(false);

    // 存储校验错误
    const [straightGaugeErrors, setStraightGaugeErrors] = useState<any[]>([]);
    const [straightHorizontalErrors, setStraightHorizontalErrors] = useState<any[]>([]);

    // 存储校验错误
    const [curvedGaugeErrors, setcurvedGaugeErrors] = useState<any[]>([]);
    const [curvedHorizontalErrors, setcurvedHorizontalErrors] = useState<any[]>([]);

    // 编辑模式状态与防抖标记
    const [isEditing, setIsEditing] = useState(false);
    const [editingTouched, setEditingTouched] = useState(false);
    const editDebounceRef = useRef<number | null>(null);
    const straightBackupRef = useRef<FormData | null>(null);
const curvedBackupRef = useRef<FormData | null>(null);
// 概览区容器引用，用于绘制连接线
const straightGaugeOverviewRef = useRef<HTMLDivElement>(null);
const straightHorizontalOverviewRef = useRef<HTMLDivElement>(null);
const curvedGaugeOverviewRef = useRef<HTMLDivElement>(null);
const curvedHorizontalOverviewRef = useRef<HTMLDivElement>(null);
// 概览卡片独立编辑态
const [isStraightGaugeEditing, setIsStraightGaugeEditing] = useState(false);
    const [isStraightHorizontalEditing, setIsStraightHorizontalEditing] = useState(false);
    const [isCurvedGaugeEditing, setIsCurvedGaugeEditing] = useState(false);
    const [isCurvedHorizontalEditing, setIsCurvedHorizontalEditing] = useState(false);
    // 概览卡片独立备份
    const straightGaugeBackupRef = useRef<Record<string, string> | null>(null);
    const straightHorizontalBackupRef = useRef<Record<string, string> | null>(null);
    const curvedGaugeBackupRef = useRef<Record<string, string> | null>(null);
    const curvedHorizontalBackupRef = useRef<Record<string, string> | null>(null);

    // 添加顶部引用（修复类型）
    const topRef = useRef<HTMLDivElement | null>(null);
    // 添加滚动位置状态
    const [isAtTop, setIsAtTop] = useState(true);
    // 添加概览卡片在视口中的状态
    const [isOverviewInView, setIsOverviewInView] = useState(false);

    // 滚动到顶部函数
    const scrollToTop = () => {
        if (topRef.current) {
            topRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };
    // 检查是否有概览需要显示
    const hasOverview = isRailsComplete || isHorizontalComplete;

    const [currentStep, setCurrentStep] = useState(0);
    const [currentStepStatus, setCurrentStepStatus] = useState<'process' | 'wait' | 'finish' | 'error'>('process');
    const [stepStatus, setStepStatus] = useState<Array<'process' | 'wait' | 'finish' | 'error'>>(['process', 'wait', 'wait']);

    const onStepChange = (value: number) => {
        console.log('onChange:', value);
        setCurrentStepStatus('process');
        const newStatus = stepStatus.slice();
        if (newStatus[currentStep] == 'wait') {
            newStatus[currentStep] = 'process';
        }
        setStepStatus(newStatus);
        setCurrentStep(value);
        setTimeout(() => {
            const ref = value === 0 ? straightValidatorRef.current : curvedValidatorRef.current;
            if (ref) {
                lastValidationContextRef.current = { type: 'all', section: value === 0 ? 'straight' : 'curved' };
                ref.validateAll().catch(err => console.error('步骤切换校验失败:', err));
            }
        }, 0);
    };





    // 处理表单值变化
    const handleStraightValuesChange = (changedValues: any, allValues: any) => {
        setStraightRailFormData(allValues);
    };

    // 处理表单值变化
    const handleCurvedValuesChange = (changedValues: any, allValues: any) => {
        setCurvedRailFormData(allValues);
    };

    // 获取表单字段值
    const getFieldValue = (fieldPath: any) => {
        return straightForm.getFieldValue(fieldPath) || '';
    };
    // // 提取已填写的字段数据
    // const filledFields = useMemo(() => {
    //     const result: any[] = [];

    //     // 处理轨距部分
    //     Object.entries(straightRailFormData.gauge).forEach(([key, value]) => {
    //         if (value && typeof value === 'string' && value.trim() !== '') {
    //             const field = straightGaugeColumnTypes.find(col => col.name === key);
    //             if (field && !field.hidden) {
    //                 result.push({
    //                     type: '轨距',
    //                     label: field.label,
    //                     value
    //                 });
    //             }
    //         }
    //     });

    //     // 处理水平部分
    //     Object.entries(straightRailFormData.horizontal).forEach(([key, value]) => {
    //         if (value && typeof value === 'string' && value.trim() !== '') {
    //             const field = straightHorizontalColumnTypes.find(col => col.name === key);
    //             if (field && !field.hidden) {
    //                 result.push({
    //                     type: '水平',
    //                     label: field.label,
    //                     value
    //                 });
    //             }
    //         }
    //     });

    //     return result;
    // }, [straightRailFormData, straightGaugeColumnTypes, straightHorizontalColumnTypes]);
    // 准备传递给直轨校验组件的数据
    // 保证传入校验组件的数据是纯字符串记录
    const toStringRecord = (obj: { [key: string]: string | undefined }): Record<string, string> => {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? v : ''])
        ) as Record<string, string>;
    };

    const prepareStraightRailGaugeData = () => {
        return [toStringRecord(straightRailFormData.gauge)];
    };

    const prepareStraightRailHorizontalData = () => {
        return [toStringRecord(straightRailFormData.horizontal)];
    };

    // 准备传递给曲轨校验组件的数据
    const prepareCurvedRailGaugeData = () => {
        return [toStringRecord(curvedRailFormData.gauge)];
    };

    const prepareCurvedRailHorizontalData = () => {
        return [toStringRecord(curvedRailFormData.horizontal)];
    };

    // 编辑模式切换与防抖
    const toggleEdit = () => {
        if (editDebounceRef.current) {
            window.clearTimeout(editDebounceRef.current);
        }
        editDebounceRef.current = window.setTimeout(() => {
            setIsEditing(prev => {
                if (!prev) {
                    // 进入编辑态时快照当前状态，用于取消回滚
                    straightBackupRef.current = JSON.parse(JSON.stringify(straightRailFormData));
                    curvedBackupRef.current = JSON.parse(JSON.stringify(curvedRailFormData));
                }
                return !prev;
            });
            setEditingTouched(false);
        }, 150);
    };

    const onEditChange = () => {
        if (!isStraightGaugeEditing && !isStraightHorizontalEditing && !isCurvedGaugeEditing && !isCurvedHorizontalEditing) return;
        setEditingTouched(true);
    };

    const cancelEdit = () => {
        if (editDebounceRef.current) {
            window.clearTimeout(editDebounceRef.current);
        }
        editDebounceRef.current = window.setTimeout(() => {
            // 回滚到进入编辑态前的快照
            if (straightBackupRef.current) {
                setStraightRailFormData(straightBackupRef.current);
            }
            if (curvedBackupRef.current) {
                setCurvedRailFormData(curvedBackupRef.current);
            }
            setIsEditing(false);
            setEditingTouched(false);
        }, 150);
    };

    const saveEdit = () => {
        if (editDebounceRef.current) {
            window.clearTimeout(editDebounceRef.current);
        }
        // 在此可以扩展：将修改写回 sessionStorage
        editDebounceRef.current = window.setTimeout(() => {
            try {
                // 写回直轨
                sessionStorage.setItem(STORAGE_KEYS.straightGauge, JSON.stringify(toStringRecord(straightRailFormData.gauge)));
                sessionStorage.setItem(STORAGE_KEYS.straightHorizontal, JSON.stringify(toStringRecord(straightRailFormData.horizontal)));
                // 写回曲轨
                sessionStorage.setItem(STORAGE_KEYS.curvedGauge, JSON.stringify(toStringRecord(curvedRailFormData.gauge)));
                sessionStorage.setItem(STORAGE_KEYS.curvedHorizontal, JSON.stringify(toStringRecord(curvedRailFormData.horizontal)));
            } catch (e) {
                console.error('保存会话数据失败:', e);
            }
            setIsEditing(false);
            setEditingTouched(false);
        }, 150);
    };

    // 概览卡片：独立编辑控制
    const toggleOverviewEdit = (section: 'straightGauge' | 'straightHorizontal' | 'curvedGauge' | 'curvedHorizontal') => {
        if (editDebounceRef.current) {
            window.clearTimeout(editDebounceRef.current);
        }
        editDebounceRef.current = window.setTimeout(() => {
            switch (section) {
                case 'straightGauge':
                    setIsStraightGaugeEditing(prev => {
                        if (!prev) {
                            straightGaugeBackupRef.current = JSON.parse(JSON.stringify(straightRailFormData.gauge));
                        }
                        return !prev;
                    });
                    break;
                case 'straightHorizontal':
                    setIsStraightHorizontalEditing(prev => {
                        if (!prev) {
                            straightHorizontalBackupRef.current = JSON.parse(JSON.stringify(straightRailFormData.horizontal));
                        }
                        return !prev;
                    });
                    break;
                case 'curvedGauge':
                    setIsCurvedGaugeEditing(prev => {
                        if (!prev) {
                            curvedGaugeBackupRef.current = JSON.parse(JSON.stringify(curvedRailFormData.gauge));
                        }
                        return !prev;
                    });
                    break;
                case 'curvedHorizontal':
                    setIsCurvedHorizontalEditing(prev => {
                        if (!prev) {
                            curvedHorizontalBackupRef.current = JSON.parse(JSON.stringify(curvedRailFormData.horizontal));
                        }
                        return !prev;
                    });
                    break;
            }
            setEditingTouched(false);
        }, 150);
    };

    const cancelOverviewEdit = (section: 'straightGauge' | 'straightHorizontal' | 'curvedGauge' | 'curvedHorizontal') => {
        if (editDebounceRef.current) {
            window.clearTimeout(editDebounceRef.current);
        }
        editDebounceRef.current = window.setTimeout(() => {
            switch (section) {
                case 'straightGauge':
                    if (straightGaugeBackupRef.current) {
                        setStraightRailFormData(prev => ({ ...prev, gauge: straightGaugeBackupRef.current! }));
                    }
                    setIsStraightGaugeEditing(false);
                    break;
                case 'straightHorizontal':
                    if (straightHorizontalBackupRef.current) {
                        setStraightRailFormData(prev => ({ ...prev, horizontal: straightHorizontalBackupRef.current! }));
                    }
                    setIsStraightHorizontalEditing(false);
                    break;
                case 'curvedGauge':
                    if (curvedGaugeBackupRef.current) {
                        setCurvedRailFormData(prev => ({ ...prev, gauge: curvedGaugeBackupRef.current! }));
                    }
                    setIsCurvedGaugeEditing(false);
                    break;
                case 'curvedHorizontal':
                    if (curvedHorizontalBackupRef.current) {
                        setCurvedRailFormData(prev => ({ ...prev, horizontal: curvedHorizontalBackupRef.current! }));
                    }
                    setIsCurvedHorizontalEditing(false);
                    break;
            }
            setEditingTouched(false);
        }, 150);
    };

    const saveOverviewEdit = (section: 'straightGauge' | 'straightHorizontal' | 'curvedGauge' | 'curvedHorizontal') => {
        if (editDebounceRef.current) {
            window.clearTimeout(editDebounceRef.current);
        }
        editDebounceRef.current = window.setTimeout(() => {
            try {
                switch (section) {
                    case 'straightGauge':
                        sessionStorage.setItem(STORAGE_KEYS.straightGauge, JSON.stringify(toStringRecord(straightRailFormData.gauge)));
                        setIsStraightGaugeEditing(false);
                        break;
                    case 'straightHorizontal':
                        sessionStorage.setItem(STORAGE_KEYS.straightHorizontal, JSON.stringify(toStringRecord(straightRailFormData.horizontal)));
                        setIsStraightHorizontalEditing(false);
                        break;
                    case 'curvedGauge':
                        sessionStorage.setItem(STORAGE_KEYS.curvedGauge, JSON.stringify(toStringRecord(curvedRailFormData.gauge)));
                        setIsCurvedGaugeEditing(false);
                        break;
                    case 'curvedHorizontal':
                        sessionStorage.setItem(STORAGE_KEYS.curvedHorizontal, JSON.stringify(toStringRecord(curvedRailFormData.horizontal)));
                        setIsCurvedHorizontalEditing(false);
                        break;
                }
            } catch (e) {
                console.error('保存会话数据失败:', e);
            }
            setEditingTouched(false);
        }, 150);
    };

    

    // 直轨
    // 检查轨距表单是否完成（仅在 currentStep 为 0 时）
    useEffect(() => {
        if (currentStep !== 0) return;
        const railsComplete = straightGaugeColumnTypes
            .filter(col => !col.hidden)
            .every(col => {
                const value = straightRailFormData.gauge[col.name];
                return value !== undefined && value !== null && String(value).trim() !== '';
            });
        setIsRailsComplete(railsComplete);
    }, [currentStep, straightRailFormData.gauge, straightGaugeColumnTypes]);

    // 检查水平表单是否完成（仅在 currentStep 为 0 时）
    useEffect(() => {
        if (currentStep !== 0) return;
        const horizontalComplete = straightHorizontalColumnTypes
            .filter(col => !col.hidden)
            .every(col => {
                const value = straightRailFormData.horizontal[col.name];
                return value !== undefined && value !== null && String(value).trim() !== '';
            });
        setIsHorizontalComplete(horizontalComplete);
    }, [currentStep, straightRailFormData.horizontal, straightHorizontalColumnTypes]);

    // 曲轨
    // 检查轨距表单是否完成（仅在 currentStep 为 1 时）
    useEffect(() => {
        if (currentStep !== 1) return;
        const railsComplete = curvedGaugeColumnTypes
            .filter(col => !col.hidden)
            .every(col => {
                const value = curvedRailFormData.gauge[col.name];
                return value !== undefined && value !== null && String(value).trim() !== '';
            });
        setIsRailsComplete(railsComplete);
    }, [currentStep, curvedRailFormData.gauge, curvedGaugeColumnTypes]);

    // 检查水平表单是否完成（仅在 currentStep 为 1 时）
    useEffect(() => {
        if (currentStep !== 1) return;
        const horizontalComplete = curvedHorizontalColumnTypes
            .filter(col => !col.hidden)
            .every(col => {
                const value = curvedRailFormData.horizontal[col.name];
                return value !== undefined && value !== null && String(value).trim() !== '';
            });
        setIsHorizontalComplete(horizontalComplete);
    }, [currentStep, curvedRailFormData.horizontal, curvedHorizontalColumnTypes]);

    // 监听滚动事件
    useEffect(() => {
        const handleScroll = () => {
            // 检查是否在页面顶部
            setIsAtTop(window.scrollY === 0);

            // 检查概览卡片是否在视口中
            const overviewCards = document.querySelectorAll('.overview-card');
            let anyInView = false;

            overviewCards.forEach(card => {
                const rect = card.getBoundingClientRect();
                // 检查卡片是否在视口中（至少部分可见）
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    anyInView = true;
                }
            });

            setIsOverviewInView(anyInView);
        };

        window.addEventListener('scroll', handleScroll);
        // 初始检查
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [hasOverview]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const ref = (currentStep === 0 ? straightValidatorRef.current : curvedValidatorRef.current);
            if (ref) {
                lastValidationContextRef.current = { type: 'all', section: currentStep === 0 ? 'straight' : 'curved' };
                try { ref.validateAll(); } catch {}
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentStep]);

    // 路由进入/页面首次挂载时触发一次整体校验
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const ref = (currentStep === 0 ? straightValidatorRef.current : curvedValidatorRef.current);
            if (ref) {
                lastValidationContextRef.current = { type: 'all', section: currentStep === 0 ? 'straight' : 'curved' };
                try {
                    ref.validateAll();
                } catch (e) {
                    console.error('校验失败:', e);
                }
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const handleStraightValidationComplete = (railErrors: any[], horizontalErrors: any[]) => {
        const ctx = lastValidationContextRef.current;
        if (ctx && ctx.section === 'straight' && ctx.type !== 'all' && ctx.changedKeys && ctx.changedKeys.length) {
            const changedSet = new Set(ctx.changedKeys);
            const filterByChanged = (errs: any[]) => errs.filter(e => Array.isArray(e.columnNames) && e.columnNames.some((n: string) => changedSet.has(n)));
            const mergePartial = (prev: any[], updatedSubset: any[]) => {
                const keepPrev = prev.filter(e => !Array.isArray(e.columnNames) || !e.columnNames.some((n: string) => changedSet.has(n)));
                return [...keepPrev, ...updatedSubset];
            };
            if (ctx.type === 'rail') {
                const nextGauge = mergePartial(straightGaugeErrors, filterByChanged(railErrors));
                setStraightGaugeErrors(nextGauge);
            } else {
                const nextHorizontal = mergePartial(straightHorizontalErrors, filterByChanged(horizontalErrors));
                setStraightHorizontalErrors(nextHorizontal);
            }
            const finalGauge = ctx.type === 'rail' ? mergePartial(straightGaugeErrors, filterByChanged(railErrors)) : straightGaugeErrors;
            const finalHorizontal = ctx.type === 'horizontal' ? mergePartial(straightHorizontalErrors, filterByChanged(horizontalErrors)) : straightHorizontalErrors;
            const ok = (finalGauge.length === 0) && (finalHorizontal.length === 0);
            setCurrentStepStatus(ok ? 'finish' : 'error');
            const newStepStatus = stepStatus.slice();
            newStepStatus[currentStep] = ok ? 'finish' : 'error';
            setStepStatus(newStepStatus);
            return;
        }

        setStraightGaugeErrors(railErrors);
        setStraightHorizontalErrors(horizontalErrors);
        const ok = railErrors.length === 0 && horizontalErrors.length === 0;
        setCurrentStepStatus(ok ? 'finish' : 'error');
        const newStepStatus = stepStatus.slice();
        newStepStatus[currentStep] = ok ? 'finish' : 'error';
        setStepStatus(newStepStatus);
    };

    const handleCurvedValidationComplete = (railErrors: any[], horizontalErrors: any[]) => {
        const ctx = lastValidationContextRef.current;
        if (ctx && ctx.section === 'curved' && ctx.type !== 'all' && ctx.changedKeys && ctx.changedKeys.length) {
            const changedSet = new Set(ctx.changedKeys);
            const filterByChanged = (errs: any[]) => errs.filter(e => Array.isArray(e.columnNames) && e.columnNames.some((n: string) => changedSet.has(n)));
            const mergePartial = (prev: any[], updatedSubset: any[]) => {
                const keepPrev = prev.filter(e => !Array.isArray(e.columnNames) || !e.columnNames.some((n: string) => changedSet.has(n)));
                return [...keepPrev, ...updatedSubset];
            };
            if (ctx.type === 'rail') {
                const nextGauge = mergePartial(curvedGaugeErrors, filterByChanged(railErrors));
                setcurvedGaugeErrors(nextGauge);
            } else {
                const nextHorizontal = mergePartial(curvedHorizontalErrors, filterByChanged(horizontalErrors));
                setcurvedHorizontalErrors(nextHorizontal);
            }
            const finalGauge = ctx.type === 'rail' ? mergePartial(curvedGaugeErrors, filterByChanged(railErrors)) : curvedGaugeErrors;
            const finalHorizontal = ctx.type === 'horizontal' ? mergePartial(curvedHorizontalErrors, filterByChanged(horizontalErrors)) : curvedHorizontalErrors;
            const ok = (finalGauge.length === 0) && (finalHorizontal.length === 0);
            setCurrentStepStatus(ok ? 'finish' : 'error');
            const newStepStatus = stepStatus.slice();
            newStepStatus[currentStep] = ok ? 'finish' : 'error';
            setStepStatus(newStepStatus);
            return;
        }

        setcurvedGaugeErrors(railErrors);
        setcurvedHorizontalErrors(horizontalErrors);
        const ok = railErrors.length === 0 && horizontalErrors.length === 0;
        setCurrentStepStatus(ok ? 'finish' : 'error');
        const newStepStatus = stepStatus.slice();
        newStepStatus[currentStep] = ok ? 'finish' : 'error';
        setStepStatus(newStepStatus);
    };

    // 获取列错误
    const getColumnErrors = (columnName: string, errors: any[]) => {
        console.log('getColumnErrors:', columnName, errors);
        
        return errors.filter(error =>
            error.columnNames && error.columnNames.includes(columnName)
        );
    };

    // 获取行错误
    const getRowErrors = (errors: any[]) => {
        return errors.filter(error =>
            error.columnNames && error.columnNames.length > 1
        );
    };

    // 三角坑异常识别与渲染辅助
    const isTriangleDepressionError = (error: any) => {
        return String(error?.ruleName || '').includes('TriangleDepression')
            || String(error?.message || '').includes('三角坑');
    };

    const getTrianglePairsFromErrors = (errors: any[]) => {
        return getRowErrors(errors)
            .filter(isTriangleDepressionError)
            .map((e: any) => (e.columnNames && e.columnNames.length >= 2 ? [e.columnNames[0], e.columnNames[1]] : null))
            .filter(Boolean) as [string, string][];
    };

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth <= 768);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        const id = 'triangle-pulse-keyframes';
        if (!document.getElementById(id)) {
            const styleEl = document.createElement('style');
            styleEl.id = id;
            styleEl.textContent = `
@keyframes triangle-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
`;
            document.head.appendChild(styleEl);
        }
    }, []);

    const TriangleMarker: React.FC<{ onClick?: () => void, size?: number }> = ({ onClick, size }) => {
        const s = size || (isMobile ? 8 : 12);
        return (
            <Tooltip title="三角坑异常数据">
                <svg
                    width={s}
                    height={s}
                    viewBox="0 0 12 12"
                    style={{ cursor: 'pointer', color: 'inherit', animation: 'triangle-pulse 0.8s ease-in-out infinite' }}
                    onClick={onClick}
                >
                    <polygon points="6,0 12,12 0,12" fill="rgb(255,0,0)" />
                </svg>
            </Tooltip>
        );
    };

    const scrollToOverviewItem = (section: string, colName: string) => {
        const id = `item-${section}-${colName}`;
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    type EdgeType = 'left' | 'right' | 'top' | 'bottom' | 'overlap';
    type EdgeCenterType = 'left' | 'right' | 'top' | 'bottom';
    type Line = { x1: number, y1: number, x2: number, y2: number, startEdge: EdgeType, endEdge: EdgeType, distance: number };
    const ConnectorLayer: React.FC<{ containerRef: React.RefObject<HTMLDivElement | null>, section: string, pairs: [string,string][], onCompute?: (outputs: { pair: [string,string], startEdge: EdgeType, endEdge: EdgeType, distance: number, points: { x1: number, y1: number, x2: number, y2: number } }[]) => void }> = ({ containerRef, section, pairs, onCompute }) => {
        const [lines, setLines] = useState<Line[]>([]);
        const rafRef = useRef<number | null>(null);
        const bufferRef = useRef<Line[]>([]);

        useEffect(() => {
            const getRotation = (el: HTMLElement): number => {
                const t = window.getComputedStyle(el).transform;
                if (!t || t === 'none') return 0;
                if (t.startsWith('matrix(')) {
                    const m = t.slice(7, -1).split(',').map(Number);
                    const a = m[0], b = m[1];
                    return Math.atan2(b, a);
                }
                return 0; // ignore matrix3d for simplicity
            };

            const toLocal = (x: number, y: number, rect: DOMRect) => ({ x: x - rect.left, y: y - rect.top });

            const getEdgeCenters = (el: HTMLElement, r: DOMRect, containerRect: DOMRect): Record<EdgeCenterType, { x: number, y: number }> => {
                const theta = getRotation(el);
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;

                if (Math.abs(theta) > 0.0001) {
                    const w = el.offsetWidth || r.width;
                    const h = el.offsetHeight || r.height;
                    const cos = Math.cos(theta), sin = Math.sin(theta);
                    const rot = (x: number, y: number) => ({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos });
                    return {
                        left: toLocal(rot(-w / 2, 0).x, rot(-w / 2, 0).y, containerRect),
                        right: toLocal(rot(w / 2, 0).x, rot(w / 2, 0).y, containerRect),
                        top: toLocal(rot(0, -h / 2).x, rot(0, -h / 2).y, containerRect),
                        bottom: toLocal(rot(0, h / 2).x, rot(0, h / 2).y, containerRect),
                    };
                }

                return {
                    left: toLocal(r.left, r.top + r.height / 2, containerRect),
                    right: toLocal(r.right, r.top + r.height / 2, containerRect),
                    top: toLocal(r.left + r.width / 2, r.top, containerRect),
                    bottom: toLocal(r.left + r.width / 2, r.bottom, containerRect),
                };
            };

            const getOverlapCenter = (ra: DOMRect, rb: DOMRect, containerRect: DOMRect) => {
                const ox = Math.max(ra.left, rb.left);
                const oy = Math.max(ra.top, rb.top);
                const or = Math.min(ra.right, rb.right);
                const ob = Math.min(ra.bottom, rb.bottom);
                const cx = (ox + or) / 2;
                const cy = (oy + ob) / 2;
                return toLocal(cx, cy, containerRect);
            };

            const candidates: [EdgeCenterType, EdgeCenterType][] = [
                ['left','left'],['left','right'],['left','top'],['left','bottom'],
                ['right','left'],['right','right'],['right','top'],['right','bottom'],
                ['top','left'],['top','right'],['top','top'],['top','bottom'],
                ['bottom','left'],['bottom','right'],['bottom','top'],['bottom','bottom'],
            ];

            const outwardOffset = (edge: EdgeCenterType) => {
                switch(edge) {
                    case 'left': return { dx: -2, dy: 0 };
                    case 'right': return { dx: 2, dy: 0 };
                    case 'top': return { dx: 0, dy: -2 };
                    case 'bottom': return { dx: 0, dy: 2 };
                    default: return { dx: 0, dy: 0 };
                }
            };

            const computeLines = () => {
                if (!containerRef.current) return;
                const containerRect = containerRef.current.getBoundingClientRect();
                const next: Line[] = [];
                const outputs: { pair: [string,string], startEdge: EdgeType, endEdge: EdgeType, distance: number, points: { x1: number, y1: number, x2: number, y2: number } }[] = [];

                for (const [a, b] of pairs) {
                    const ca = document.getElementById(`item-${section}-${a}`);
                    const cb = document.getElementById(`item-${section}-${b}`);
                    if (!ca || !cb) continue;

                    const va = (ca.querySelector('[data-connector-anchor="value"]') as HTMLElement | null) ?? (ca as HTMLElement);
                    const vb = (cb.querySelector('[data-connector-anchor="value"]') as HTMLElement | null) ?? (cb as HTMLElement);

                    const ra = va.getBoundingClientRect();
                    const rb = vb.getBoundingClientRect();

                    const isOverlap = !(ra.right < rb.left || rb.right < ra.left || ra.bottom < rb.top || rb.bottom < ra.top);

                    if (isOverlap) {
                        const p = getOverlapCenter(ra, rb, containerRect);
                        const line: Line = { x1: p.x, y1: p.y, x2: p.x, y2: p.y, startEdge: 'overlap', endEdge: 'overlap', distance: 0 };
                        next.push(line);
                        outputs.push({ pair: [a,b], startEdge: 'overlap', endEdge: 'overlap', distance: 0, points: { x1: p.x, y1: p.y, x2: p.x, y2: p.y } });
                        continue;
                    }

                    const ea = getEdgeCenters(va, ra, containerRect);
                    const eb = getEdgeCenters(vb, rb, containerRect);

                    let best: { start: EdgeCenterType, end: EdgeCenterType, p1: {x:number,y:number}, p2: {x:number,y:number}, d: number } | null = null;

                    for (const [sa, sb] of candidates) {
                        const p1 = ea[sa];
                        const p2 = eb[sb];
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const d = Math.hypot(dx, dy);
                        if (!best || d < best.d) {
                            best = { start: sa, end: sb, p1, p2, d };
                        }
                    }

                    if (best) {
                        const o1 = outwardOffset(best.start);
                        const o2 = outwardOffset(best.end);
                        const x1 = best.p1.x + o1.dx;
                        const y1 = best.p1.y + o1.dy;
                        const x2 = best.p2.x + o2.dx;
                        const y2 = best.p2.y + o2.dy;
                        const line: Line = { x1, y1, x2, y2, startEdge: best.start, endEdge: best.end, distance: best.d };
                        next.push(line);
                        outputs.push({ pair: [a,b], startEdge: best.start, endEdge: best.end, distance: best.d, points: { x1, y1, x2, y2 } });
                    }
                }

                bufferRef.current = next;

                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = requestAnimationFrame(() => {
                    setLines(bufferRef.current);
                    if (outputs.length && onCompute) {
                        try { onCompute(outputs); } catch {}
                    }
                });
            };

            const handleResize = () => {
                bufferRef.current = [];
                computeLines();
            };

            computeLines();

            window.addEventListener('resize', handleResize);

            let ro: ResizeObserver | null = null;
            if (containerRef.current && 'ResizeObserver' in window) {
                ro = new ResizeObserver(handleResize);
                ro.observe(containerRef.current);
            }

            let mo: MutationObserver | null = null;
            if (containerRef.current && 'MutationObserver' in window) {
                mo = new MutationObserver(() => {
                    handleResize();
                });
                try {
                    mo.observe(containerRef.current, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
                } catch {}
            }

            return () => {
                window.removeEventListener('resize', handleResize);
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                if (ro && containerRef.current) {
                    try { ro.disconnect(); } catch {}
                }
                if (mo) {
                    try { mo.disconnect(); } catch {}
                }
            };
        }, [pairs, containerRef, section, onCompute]);

        return (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}>
                {lines.map((l, i) => (
                    <line
                        key={i}
                        x1={l.x1}
                        y1={l.y1}
                        x2={l.x2}
                        y2={l.y2}
                        stroke="rgb(200,0,0)"
                        strokeWidth={1.5}
                        strokeDasharray="5 2"
                        strokeLinecap="round"
                        opacity={0.85}
                    />
                ))}
            </svg>
        );
    };

    const renderOverviewTop = () => (
        <>
            {/* 直轨：轨距概览 */}
            {currentStep == 0 && (
                isRailsComplete ? (
                <Card
                    title="轨距 - 数据概览"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    headStyle={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: isStraightGaugeEditing ? '#fffbe6' : '#e6f7ff',
                        padding: '12px 24px'
                    }}
                    className="overview-card"
                    bordered={true}
                    extra={
                        <Space wrap>
                            {!isStraightGaugeEditing && (
                                <Button size="small" type="primary" onClick={() => toggleOverviewEdit('straightGauge')}>编辑</Button>
                            )}
                            {isStraightGaugeEditing && (
                                <>
                                    <Button size="small" type="primary" onClick={() => saveOverviewEdit('straightGauge')}>保存</Button>
                                    <Button size="small" danger onClick={() => cancelOverviewEdit('straightGauge')}>取消</Button>
                                </>
                            )}
                        </Space>
                    }
                >
                    <Space direction="vertical">
                        <div ref={straightGaugeOverviewRef} style={{ position: 'relative' }}>
                            <Descriptions
                                bordered
                                size="small"
                                column={{
                                    xs: 3,
                                    sm: 6,
                                    md: 8,
                                    lg: 8,
                                    xl: 16,
                                    xxl: 16,
                                }}
                                className="filled-fields-description"
                                layout='vertical'
                            >
                                {straightGaugeColumnTypes
                                    .filter(col => !col.hidden)
                                    .map(col => {
                                        const errors = getColumnErrors(col.name, straightGaugeErrors);
                                        const hasError = errors.length > 0;
                                        const hasTriangle = errors.some(isTriangleDepressionError);

                                        return (
                                            <Descriptions.Item
                                                key={`gauge-${col.name}`}
                                                label={col.label}
                                                className={hasError ? 'error-column' : ''}
                                            >
                                                <Flex id={`item-straightGauge-${col.name}`} justify={'space-around'} wrap gap="small">
                                                    {!isStraightGaugeEditing && (
                                                        <span data-connector-anchor="value">{straightRailFormData.gauge[col.name] || ''}</span>
                                                    )}
                                                    {isStraightGaugeEditing && (
                                                        <Input
                                                            data-connector-anchor="value"
                                                            size="small"
                                                            value={straightRailFormData.gauge[col.name] || ''}
                                                            onChange={(e) => {
                                                                setStraightRailFormData(prev => ({
                                                                    ...prev,
                                                                    gauge: {
                                                                        ...prev.gauge,
                                                                        [col.name]: e.target.value,
                                                                    }
                                                                }));
                                                                onEditChange();
                                                            }}
                                                            style={{ maxWidth: 180 }}
                                                        />
                                                    )}
                                                    {hasTriangle && (
                                                        <TriangleMarker onClick={() => scrollToOverviewItem('straightGauge', col.name)} />
                                                    )}
                                                    {hasError && (<>
                                                        <br />
                                                        <Popover title="错误详情" content={
                                                            <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                                                                {errors.map((error, idx) => (
                                                                    <div key={idx} style={{ fontSize: 12 }}>
                                                                        {error.message}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        }>
                                                            <Tag color="error" style={{ marginLeft: 8 }}>
                                                                <ExclamationCircleOutlined /> {errors.length}
                                                            </Tag>
                                                        </Popover>
                                                    </>)}
                                                </Flex>
                                            </Descriptions.Item>
                                        );
                                    })
                                }
                            </Descriptions>
                            <ConnectorLayer containerRef={straightGaugeOverviewRef} section="straightGauge" pairs={getTrianglePairsFromErrors(straightGaugeErrors)} />
                        </div>

                        {/* 行级别错误显示 */}
                        {getRowErrors(straightGaugeErrors).length > 0 && (
                            <> 
                                <Alert
                                    showIcon
                                    message="行级错误:"
                                    type="error"
                                    description={
                                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                                            {getRowErrors(straightGaugeErrors).map((error, idx) => (
                                                <li key={idx} style={{ marginBottom: 8, listStyle: 'disc' }}>
                                                    <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                                        {error.columnNames.map((n: string) => {
                                                            const found = straightGaugeColumnTypes.find(c => c.name === n);
                                                            return found ? found.label : n;
                                                        }).join(' & ')}:
                                                    </div>
                                                    <div style={{ fontSize: 14, marginTop: 4 }}>
                                                        {error.message}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                />
                            </>
                        )}
                    </Space>

                </Card>
                ) : (
                <Card
                    title="轨距 - 数据概览"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    headStyle={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: '#fffbe6',
                        padding: '12px 24px'
                    }}
                    className="overview-card"
                    bordered={true}
                >
                    <Alert
                        showIcon
                        type="warning"
                        message="未完成填充"
                        description="请返回数据采集页面，采集所有字段以查看概览。"
                    />
                </Card>
                )
            )}

            {/* 直轨：水平概览 */}
            {currentStep == 0 && (
                isHorizontalComplete ? (
                <Card
                    title="水平 - 数据概览"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    headStyle={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: isStraightHorizontalEditing ? '#fffbe6' : '#e6f7ff',
                        padding: '12px 24px'
                    }}
                    className="overview-card"
                    extra={
                        <Space wrap>
                            {!isStraightHorizontalEditing && (
                                <Button size="small" type="primary" onClick={() => toggleOverviewEdit('straightHorizontal')}>编辑</Button>
                            )}
                            {isStraightHorizontalEditing && (
                                <>
                                    <Button size="small" type="primary" onClick={() => saveOverviewEdit('straightHorizontal')}>保存</Button>
                                    <Button size="small" danger onClick={() => cancelOverviewEdit('straightHorizontal')}>取消</Button>
                                </>
                            )}
                        </Space>
                    }
                >
                    <Space direction="vertical">
                    <div ref={straightHorizontalOverviewRef} style={{ position: 'relative' }}>
                        <Descriptions
                            bordered
                            size="small"
                            column={{
                                xs: 3,
                                sm: 6,
                                md: 8,
                                lg: 8,
                                xl: 16,
                                xxl: 16,
                            }}
                            className="filled-fields-description"
                            layout='vertical'
                        >
                            {straightHorizontalColumnTypes
                                .filter(col => !col.hidden)
                                .map(col => {
                                    const errors = getColumnErrors(col.name, straightHorizontalErrors);
                                    const hasError = errors.length > 0;
                                    const hasTriangle = errors.some(isTriangleDepressionError);

                                    return (
                                        <Descriptions.Item
                                            key={`horizontal-${col.name}`}
                                            label={col.label}
                                            className={hasError ? 'error-column' : ''}
                                        >
                                            <Flex id={`item-straightHorizontal-${col.name}`} justify={'space-around'} wrap gap="small">
                                                {!isStraightHorizontalEditing && (
                                                    <span data-connector-anchor="value">{straightRailFormData.horizontal[col.name] || ''}</span>
                                                )}
                                                {isStraightHorizontalEditing && (
                                                    <Input
                                                        data-connector-anchor="value"
                                                        size="small"
                                                        value={straightRailFormData.horizontal[col.name] || ''}
                                                        onChange={(e) => {
                                                            setStraightRailFormData(prev => ({
                                                                ...prev,
                                                                horizontal: {
                                                                    ...prev.horizontal,
                                                                    [col.name]: e.target.value,
                                                                }
                                                            }));
                                                            onEditChange();
                                                            queueFieldValidation('straightHorizontal', col.name);
                                                        }}
                                                        style={{ maxWidth: 180 }}
                                                    />
                                                )}
                                                {hasTriangle && (
                                                    <TriangleMarker onClick={() => scrollToOverviewItem('straightHorizontal', col.name)} />
                                                )}

                                                {hasError && (<>
                                                    <br />
                                                    <Popover title="错误详情" content={
                                                        <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                                                            {errors.map((error, idx) => (
                                                                <div key={idx} style={{ fontSize: 12 }}>
                                                                    {error.message}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    }>
                                                        <Tag color="error" style={{ marginLeft: 8 }}>
                                                            <ExclamationCircleOutlined /> {errors.length}
                                                        </Tag>
                                                    </Popover>
                                                </>)}
                                            </Flex>

                                            
                                        </Descriptions.Item>
                                    );
                                })
                            }
                        </Descriptions>
                        <ConnectorLayer containerRef={straightHorizontalOverviewRef} section="straightHorizontal" pairs={getTrianglePairsFromErrors(straightHorizontalErrors)} />
                    </div>

                    {/* 行级别错误显示 */}
                    {getRowErrors(straightHorizontalErrors).length > 0 && (
                        <Alert
                            showIcon
                            message="行级错误:"
                            type="error"
                            description={
                                <ul style={{ paddingLeft: 16, margin: 0 }}>
                                    {getRowErrors(straightHorizontalErrors).map((error, idx) => (
                                        <li key={idx} style={{ marginBottom: 8, listStyle: 'disc' }}>
                                            <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                                {error.columnNames.map((n: string) => {
                                                    const found = straightHorizontalColumnTypes.find(c => c.name === n);
                                                    return found ? found.label : n;
                                                }).join(' + ')}:
                                            </div>
                                            <div style={{ fontSize: 14, marginTop: 4 }}>
                                                {error.message}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            }
                        />

                    )}
                    </Space>
                </Card>
                ) : (
                <Card
                    title="水平 - 数据概览"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    headStyle={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: '#fffbe6',
                        padding: '12px 24px'
                    }}
                    className="overview-card"
                >
                    <Alert
                        showIcon
                        type="warning"
                        message="未完成填充"
                                description="请返回数据采集页面，采集所有字段以查看概览。"
                    />
                </Card>
                )
            )}

            {/* 曲轨：轨距概览 */}
            {currentStep == 1 && (
                isRailsComplete ? (
                <Card
                    title="轨距 - 数据概览"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    headStyle={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: isCurvedGaugeEditing ? '#fffbe6' : '#e6f7ff',
                        padding: '12px 24px'
                    }}
                    className="overview-card"
                    extra={
                        <Space wrap>
                            {!isCurvedGaugeEditing && (
                                <Button size="small" type="primary" onClick={() => toggleOverviewEdit('curvedGauge')}>编辑</Button>
                            )}
                            {isCurvedGaugeEditing && (
                                <>
                                    <Button size="small" type="primary" onClick={() => saveOverviewEdit('curvedGauge')}>保存</Button>
                                    <Button size="small" danger onClick={() => cancelOverviewEdit('curvedGauge')}>取消</Button>
                                </>
                            )}
                        </Space>
                    }
                >
                    <Space direction="vertical">
                        <div ref={curvedGaugeOverviewRef} style={{ position: 'relative' }}>
                            <Descriptions
                                bordered
                                size="small"
                                column={{
                                    xs: 3,
                                    sm: 6,
                                    md: 8,
                                    lg: 8,
                                    xl: 16,
                                    xxl: 16,
                                }}
                                className="filled-fields-description"
                                layout='vertical'
                            >
                                {curvedGaugeColumnTypes
                                    .filter(col => !col.hidden)
                                    .map(col => {
                                        const errors = getColumnErrors(col.name, curvedGaugeErrors);
                                        const hasError = errors.length > 0;
                                        const hasTriangle = errors.some(isTriangleDepressionError);

                                        return (
                                            <Descriptions.Item
                                                key={`rails-${col.name}`}
                                                label={col.label}
                                                className={hasError ? 'error-column' : ''}
                                            >
                                                <Flex id={`item-curvedGauge-${col.name}`} justify={'space-around'} wrap gap="small">
                                                    {!isCurvedGaugeEditing && (
                                                        <span data-connector-anchor="value">{curvedRailFormData.gauge[col.name] || ''}</span>
                                                    )}
                                                    {isCurvedGaugeEditing && (
                                                        <Input
                                                            data-connector-anchor="value"
                                                            size="small"
                                                            value={curvedRailFormData.gauge[col.name] || ''}
                                                            onChange={(e) => {
                                                                setCurvedRailFormData(prev => ({
                                                                    ...prev,
                                                                    gauge: {
                                                                        ...prev.gauge,
                                                                        [col.name]: e.target.value,
                                                                    }
                                                                }));
                                                                onEditChange();
                                                            }}
                                                            style={{ maxWidth: 180 }}
                                                        />
                                                    )}

                                                    {hasTriangle && (
                                                        <TriangleMarker onClick={() => scrollToOverviewItem('curvedGauge', col.name)} />
                                                    )}

                                                    {hasError && (<>
                                                        <br />
                                                        <Popover title="错误详情" content={
                                                            <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                                                                {errors.map((error, idx) => (
                                                                    <div key={idx} style={{ fontSize: 12 }}>
                                                                        {error.message}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        }>
                                                            <Tag color="error" style={{ marginLeft: 8 }}>
                                                                <ExclamationCircleOutlined /> {errors.length}
                                                            </Tag>
                                                        </Popover>
                                                    </>)}
                                                </Flex>
                                            </Descriptions.Item>
                                        );
                                    })
                                }
                            </Descriptions>
                            <ConnectorLayer containerRef={curvedGaugeOverviewRef} section="curvedGauge" pairs={getTrianglePairsFromErrors(curvedGaugeErrors)} />
                        </div>

                        {/* 行级别错误显示 */}
                        {getRowErrors(curvedGaugeErrors).length > 0 && (
                            <> 
                                <Alert
                                    showIcon
                                    message="行级错误:"
                                    type="error"
                                    description={
                                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                                            {getRowErrors(curvedGaugeErrors).map((error, idx) => (
                                                <li key={idx} style={{ marginBottom: 8, listStyle: 'disc' }}>
                                                    <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                                        {error.columnNames.map((n: string) => {
                                                            const found = curvedGaugeColumnTypes.find(c => c.name === n);
                                                            return found ? found.label : n;
                                                        }).join(' & ')}:
                                                    </div>
                                                    <div style={{ fontSize: 14, marginTop: 4 }}>
                                                        {error.message}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                />
                            </>
                        )}
                    </Space>

                </Card>
                ) : (
                <Card
                    title="轨距 - 数据概览"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    headStyle={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: '#fffbe6',
                        padding: '12px 24px'
                    }}
                    className="overview-card"
                >
                    <Alert
                        showIcon
                        type="warning"
                        message="未完成填充"
                                description="请返回数据采集页面，采集所有字段以查看概览。"
                    />
                </Card>
                )
            )}

            {/* 曲轨：水平概览 */}
            {currentStep == 1 && (
                isHorizontalComplete ? (
                <Card
                    title="水平 - 数据概览"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    headStyle={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: isCurvedHorizontalEditing ? '#fffbe6' : '#e6f7ff',
                        padding: '12px 24px'
                    }}
                    className="overview-card"
                    extra={
                        <Space wrap>
                            {!isCurvedHorizontalEditing && (
                                <Button size="small" type="primary" onClick={() => toggleOverviewEdit('curvedHorizontal')}>编辑</Button>
                            )}
                            {isCurvedHorizontalEditing && (
                                <>
                                    <Button size="small" type="primary" onClick={() => saveOverviewEdit('curvedHorizontal')}>保存</Button>
                                    <Button size="small" danger onClick={() => cancelOverviewEdit('curvedHorizontal')}>取消</Button>
                                </>
                            )}
                        </Space>
                    }
                >
                    <div ref={curvedHorizontalOverviewRef} style={{ position: 'relative' }}>
                        <Descriptions
                            bordered
                            size="small"
                            column={{
                                xs: 3,
                                sm: 6,
                                md: 8,
                                lg: 8,
                                xl: 16,
                                xxl: 16,
                            }}
                            className="filled-fields-description"
                            layout='vertical'
                        >
                            {curvedHorizontalColumnTypes
                                .filter(col => !col.hidden)
                                .map(col => {
                                    const errors = getColumnErrors(col.name, curvedHorizontalErrors);
                                    const hasError = errors.length > 0;
                                    const hasTriangle = errors.some(isTriangleDepressionError);

                                    return (
                                        <Descriptions.Item
                                            key={`horizontal-${col.name}`}
                                            label={col.label}
                                            className={hasError ? 'error-column' : ''}
                                        >
                                            <Flex id={`item-curvedHorizontal-${col.name}`} justify={'space-around'} wrap gap="small">
                                                {!isCurvedHorizontalEditing && (
                                                    <span data-connector-anchor="value">{curvedRailFormData.horizontal[col.name] || ''}</span>
                                                )}
                                                {isCurvedHorizontalEditing && (
                                                    <Input
                                                        data-connector-anchor="value"
                                                        size="small"
                                                        value={curvedRailFormData.horizontal[col.name] || ''}
                                                        onChange={(e) => {
                                                            setCurvedRailFormData(prev => ({
                                                                ...prev,
                                                                horizontal: {
                                                                    ...prev.horizontal,
                                                                    [col.name]: e.target.value,
                                                                }
                                                            }));
                                                            onEditChange();
                                                            queueFieldValidation('curvedHorizontal', col.name);
                                                        }}
                                                        style={{ maxWidth: 180 }}
                                                    />
                                                )}

                                                {hasTriangle && (
                                                    <TriangleMarker onClick={() => scrollToOverviewItem('curvedHorizontal', col.name)} />
                                                )}

                                                {hasError && (<>
                                                        <br />
                                                        <Popover title="错误详情" content={
                                                            <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                                                                {errors.map((error, idx) => (
                                                                    <div key={idx} style={{ fontSize: 12 }}>
                                                                        {error.message}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        }>
                                                            <Tag color="error" style={{ marginLeft: 8 }}>
                                                                <ExclamationCircleOutlined /> {errors.length}
                                                            </Tag>
                                                        </Popover>
                                                    </>)}
                                            </Flex>

                                        </Descriptions.Item>
                                    );
                                })
                            }
                        </Descriptions>
                        <ConnectorLayer containerRef={curvedHorizontalOverviewRef} section="curvedHorizontal" pairs={getTrianglePairsFromErrors(curvedHorizontalErrors)} />
                    </div>

                    {/* 行级别错误显示 */}
                    {getRowErrors(curvedHorizontalErrors).length > 0 && (
                        <Alert
                            showIcon
                            message="行级错误:"
                            type="error"
                            description={
                                <ul style={{ paddingLeft: 16, margin: 0 }}>
                                    {getRowErrors(curvedHorizontalErrors).map((error, idx) => (
                                        <li key={idx} style={{ marginBottom: 8, listStyle: 'disc' }}>
                                            <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                                {error.columnNames.map((n: string) => {
                                                    const found = curvedHorizontalColumnTypes.find(c => c.name === n);
                                                    return found ? found.label : n;
                                                }).join(' + ')}:
                                            </div>
                                            <div style={{ fontSize: 14, marginTop: 4 }}>
                                                {error.message}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            }
                        />

                    )}
                </Card>
                ) : (
                <Card
                    title="水平 - 数据概览"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    headStyle={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: '#fffbe6',
                        padding: '12px 24px'
                    }}
                    className="overview-card"
                >
                    <Alert
                        showIcon
                        type="warning"
                        message="未完成填充"
                                description="请返回数据采集页面，采集所有字段以查看概览。"
                    />
                </Card>
                )
            )}
        </>
    );

    return (
        <>
            {/* 顶部锚点 */}
            <div ref={topRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            <PageContainer>
                <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: '100%', display: 'block' }}
                >
                    {/* 会话数据加载状态 */}
                    {storageStatus === 'loading' && (
                        <Alert showIcon closable type="info" message="正在从会话存储读取数据..." />
                    )}
                    {storageStatus === 'error' && (
                        <Alert showIcon closable type="error" message="会话数据读取失败" description={storageError || undefined} />
                    )}
                    {storageStatus === 'success' && (
                        <Alert showIcon closable type="success" message="已加载会话数据" />
                    )}

                    

                    <Steps
                        type='navigation'
                        size="small"
                        current={currentStep}
                        onChange={onStepChange}
                        // status={currentStepStatus}
                        items={[
                            {
                                title: '直轨数据',
                                description: '填写直轨数据',
                                status: stepStatus[0],
                            }, {
                                title: '曲轨数据',
                                description: '填写曲轨数据',
                                status: stepStatus[1],
                            },
                            {
                                title: '其他',
                                description: '填写其他数据',
                                status: stepStatus[2],
                            }
                        ]}
                    ></Steps>

                    {/* 顶部数据概览 */}
                    {renderOverviewTop()}

                    {/* 固钉按钮 - 只在有概览时显示 */}
                    {hasOverview && !isAtTop && !isOverviewInView && (
                        <Affix style={{ position: 'fixed', bottom: 50, right: 50, zIndex: 1000 }}>
                            <Button
                                type="primary"
                                shape="round"
                                icon={<UpCircleOutlined />}
                                size="large"
                                onClick={scrollToTop}
                                style={{
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    fontWeight: 'bold',
                                    background: '#1890ff',
                                    border: 'none'
                                }}
                            >
                                查看概览
                            </Button>
                        </Affix>
                    )}

                    {/* 校验组件：展示数据（保持原逻辑） */}
                    {currentStep == 0 &&(
                        <RailDataValidator
                            ref={straightValidatorRef}
                            gaugeData={prepareStraightRailGaugeData()}
                            horizontalData={prepareStraightRailHorizontalData()}
                            gaugeColumns={straightGaugeColumnTypes}
                            horizontalColumns={straightHorizontalColumnTypes}
                            onValidationComplete={handleStraightValidationComplete}
                            isEditing={isEditing}
                            onToggleEdit={toggleEdit}
                            onSaveEdit={saveEdit}
                            onCancelEdit={cancelEdit}
                        ></RailDataValidator>
                    )}

                    {currentStep == 1 && (
                        <RailDataValidator
                            ref={curvedValidatorRef}
                            gaugeData={prepareCurvedRailGaugeData()}
                            horizontalData={prepareCurvedRailHorizontalData()}
                            gaugeColumns={curvedGaugeColumnTypes}
                            horizontalColumns={curvedHorizontalColumnTypes}
                            onValidationComplete={handleCurvedValidationComplete}
                            isEditing={isEditing}
                            onToggleEdit={toggleEdit}
                            onSaveEdit={saveEdit}
                            onCancelEdit={cancelEdit}
                        ></RailDataValidator>
                    )}

                    {currentStep == 2 && (
                        <Card
                            title="其他 - 正在开发"
                            style={{ width: '100%', marginBottom: 16, borderRadius: 8 }}
                            headStyle={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                backgroundColor: '#f6ffed',
                                padding: '12px 24px'
                            }}
                            className="overview-card"
                        >
                            <Space direction="vertical" style={{ width: '100%'}}>
                                <Result status="info" title="开发中" subTitle="敬请期待" />
                                <Skeleton />
                            </Space>
                        </Card>
                    )}

                    {/* 直轨 */}
                    {/* 轨距部分的数据概览 - 只在轨距完成时显示 */}
                    {false && currentStep == 0 && isRailsComplete && (
                        <Card
                            title="轨距 - 数据概览"
                            style={{ marginBottom: 16, borderRadius: 8 }}
                            headStyle={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                backgroundColor: isEditing ? '#fffbe6' : '#e6f7ff',
                                padding: '12px 24px'
                            }}
                            className="overview-card"
                            bordered={true}
                        >
                            <Space direction="vertical">
                                <Descriptions
                                    bordered
                                    size="small"
                                    column={{
                                        xs: 3,   // 手机：3列
                                        sm: 6,   // 平板：6列
                                        md: 8,   // 中等屏幕：8列
                                        lg: 8,   // 大屏幕：8列
                                        xl: 16,   // 超大屏幕：16列
                                        xxl: 16,  // 极大屏幕：16列
                                    }}
                                    className="filled-fields-description"
                                    layout='vertical'
                                >
                                    {straightGaugeColumnTypes
                                        .filter(col => !col.hidden)
                                        .map(col => {
                                            const errors = getColumnErrors(col.name, straightGaugeErrors);
                                            const hasError = errors.length > 0;

                                            return (
                                                <Descriptions.Item
                                                    key={`gauge-${col.name}`}
                                                    label={col.label}
                                                    className={hasError ? 'error-column' : ''}
                                                >
                                                    <Flex justify={'space-around'} wrap gap="small">
                                                        {!isEditing && (
                                                            <span>{straightRailFormData.gauge[col.name] || ''}</span>
                                                        )}
                                                        {isEditing && (
                                                            <Input
                                                                size="small"
                                                                value={straightRailFormData.gauge[col.name] || ''}
                                                                onChange={(e) => {
                                                                    setStraightRailFormData(prev => ({
                                                                        ...prev,
                                                                        gauge: {
                                                                            ...prev.gauge,
                                                                            [col.name]: e.target.value,
                                                                        }
                                                                    }));
                                                                    onEditChange();
                                                                    queueFieldValidation('straightGauge', col.name);
                                                                }}
                                                                style={{ maxWidth: 180 }}
                                                            />
                                                        )}

                                                        {hasError && (<>
                                                            <br />
                                                            <Popover title="错误详情" content={
                                                                <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                                                                    {errors.map((error, idx) => (
                                                                        <div key={idx} style={{ fontSize: 12 }}>
                                                                            {error.message}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            }>
                                                                <Tag color="error" style={{ marginLeft: 8 }}>
                                                                    <ExclamationCircleOutlined /> {errors.length}
                                                                </Tag>
                                                            </Popover>
                                                        </>)}
                                                    </Flex>
                                                </Descriptions.Item>
                                            );
                                        })
                                    }
                                </Descriptions>

                                {/* 行级别错误显示 */}
                                {getRowErrors(straightGaugeErrors).length > 0 && (
                                    <> 
                                        <Alert
                                            showIcon
                                            message="行级错误:"
                                            type="error"
                                            description={
                                                <ul style={{ paddingLeft: 16, margin: 0 }}>
                                                    {getRowErrors(straightGaugeErrors).map((error, idx) => (
                                                        <li key={idx} style={{ marginBottom: 8, listStyle: 'disc' }}>
                                                            <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                                                {error.columnNames.map((n: string) => {
                                                                    const found = straightGaugeColumnTypes.find(c => c.name === n);
                                                                    return found ? found.label : n;
                                                                }).join(' & ')}:
                                                            </div>
                                                            <div style={{ fontSize: 14, marginTop: 4 }}>
                                                                {error.message}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            }
                                        />
                                    </>
                                )}
                            </Space>

                        </Card>
                    )}

                    {/* 水平部分的数据概览 - 只在水平完成时显示 */}
                    {false && currentStep == 0 && isHorizontalComplete && (
                        <Card
                            title="水平 - 数据概览"
                            style={{ marginBottom: 16, borderRadius: 8 }}
                            headStyle={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                backgroundColor: isEditing ? '#fffbe6' : '#e6f7ff',
                                padding: '12px 24px'
                            }}
                            className="overview-card"
                        >
                            <Descriptions
                                bordered
                                size="small"
                                column={{
                                    xs: 3,
                                    sm: 6,
                                    md: 8,
                                    lg: 8,
                                    xl: 16,
                                    xxl: 16,
                                }}
                                className="filled-fields-description"
                                layout='vertical'
                            >
                                {straightHorizontalColumnTypes
                                    .filter(col => !col.hidden)
                                    .map(col => {
                                        const errors = getColumnErrors(col.name, straightHorizontalErrors);
                                        const hasError = errors.length > 0;

                                        return (
                                            <Descriptions.Item
                                                key={`horizontal-${col.name}`}
                                                label={col.label}
                                                className={hasError ? 'error-column' : ''}
                                            >
                                                <Flex justify={'space-around'} wrap gap="small">
                                                    {!isEditing && (
                                                        <span>{straightRailFormData.horizontal[col.name] || ''}</span>
                                                    )}
                                                    {isEditing && (
                                                        <Input
                                                            size="small"
                                                            value={straightRailFormData.horizontal[col.name] || ''}
                                                            onChange={(e) => {
                                                                setStraightRailFormData(prev => ({
                                                                    ...prev,
                                                                    horizontal: {
                                                                        ...prev.horizontal,
                                                                        [col.name]: e.target.value,
                                                                    }
                                                                }));
                                                                onEditChange();
                                                                queueFieldValidation('straightHorizontal', col.name);
                                                            }}
                                                            style={{ maxWidth: 180 }}
                                                        />
                                                    )}

                                                    {hasError && (
                                                        <Tag color="error" style={{ marginLeft: 8 }}>
                                                            {errors.length} 个错误
                                                        </Tag>
                                                    )}
                                                </Flex>

                                                {hasError && (
                                                    <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                                                        {errors.map((error, idx) => (
                                                            <div key={idx} style={{ fontSize: 12 }}>
                                                                {error.message}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </Descriptions.Item>
                                        );
                                    })
                                }
                            </Descriptions>

                            {/* 行级别错误显示 */}
                            {getRowErrors(straightHorizontalErrors).length > 0 && (
                                <Alert
                                    showIcon
                                    message="行级错误:"
                                    type="error"
                                    description={
                                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                                            {getRowErrors(straightHorizontalErrors).map((error, idx) => (
                                                <li key={idx} style={{ marginBottom: 8, listStyle: 'disc' }}>
                                                    <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                                        {error.columnNames.map((n: string) => {
                                                            const found = straightHorizontalColumnTypes.find(c => c.name === n);
                                                            return found ? found.label : n;
                                                        }).join(' + ')}:
                                                    </div>
                                                    <div style={{ fontSize: 14, marginTop: 4 }}>
                                                        {error.message}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                />

                            )}
                        </Card>
                    )}



                    {/* 曲轨 */}
                    {/* 轨距部分的数据概览 - 只在轨距完成时显示 */}
                    {false && currentStep == 1 && isRailsComplete && (
                        <Card
                            title="轨距 - 数据概览"
                            style={{ marginBottom: 16, borderRadius: 8 }}
                            headStyle={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                backgroundColor: isEditing ? '#fffbe6' : '#e6f7ff',
                                padding: '12px 24px'
                            }}
                            className="overview-card"
                        >
                            <Space direction="vertical">
                                <Descriptions
                                    bordered
                                    size="small"
                                    column={{
                                        xs: 3,
                                        sm: 6,
                                        md: 8,
                                        lg: 8,
                                        xl: 16,
                                        xxl: 16,
                                    }}
                                    className="filled-fields-description"
                                    layout='vertical'
                                >
                                    {curvedGaugeColumnTypes
                                        .filter(col => !col.hidden)
                                        .map(col => {
                                            const errors = getColumnErrors(col.name, curvedGaugeErrors);
                                            const hasError = errors.length > 0;

                                            return (
                                                <Descriptions.Item
                                                    key={`rails-${col.name}`}
                                                    label={col.label}
                                                    className={hasError ? 'error-column' : ''}
                                                >
                                                    <Flex justify={'space-around'} wrap gap="small">
                                                        {!isEditing && (
                                                            <span>{curvedRailFormData.gauge[col.name] || ''}</span>
                                                        )}
                                                        {isEditing && (
                                                            <Input
                                                                size="small"
                                                                value={curvedRailFormData.gauge[col.name] || ''}
                                                                onChange={(e) => {
                                                                    setCurvedRailFormData(prev => ({
                                                                        ...prev,
                                                                        gauge: {
                                                                            ...prev.gauge,
                                                                            [col.name]: e.target.value,
                                                                        }
                                                                    }));
                                                                    onEditChange();
                                                                    queueFieldValidation('curvedGauge', col.name);
                                                                }}
                                                                style={{ maxWidth: 180 }}
                                                            />
                                                        )}

                                                        {hasError && (<>
                                                            <br />
                                                            <Popover title="错误详情" content={
                                                                <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                                                                    {errors.map((error, idx) => (
                                                                        <div key={idx} style={{ fontSize: 12 }}>
                                                                            {error.message}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            }>
                                                                <Tag color="error" style={{ marginLeft: 8 }}>
                                                                    <ExclamationCircleOutlined /> {errors.length}
                                                                </Tag>
                                                            </Popover>
                                                        </>


                                                        )}
                                                    </Flex>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>

                                                    </div>
                                                </Descriptions.Item>
                                            );
                                        })
                                    }
                                </Descriptions>

                                {/* 行级别错误显示 */}
                                {getRowErrors(curvedGaugeErrors).length > 0 && (
                                    <>
                                        <Alert
                                            showIcon
                                            message="行级错误:"
                                            type="error"
                                            description={
                                                <ul style={{ paddingLeft: 16, margin: 0 }}>
                                                    {getRowErrors(curvedGaugeErrors).map((error, idx) => (
                                                        <li key={idx} style={{ marginBottom: 8, listStyle: 'disc' }}>
                                                            <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                                                {error.columnNames.map((n: string) => {
                                                                    const found = curvedGaugeColumnTypes.find(c => c.name === n);
                                                                    return found ? found.label : n;
                                                                }).join(' & ')}:
                                                            </div>
                                                            <div style={{ fontSize: 14, marginTop: 4 }}>
                                                                {error.message}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            }
                                        />

                                    </>
                                )}
                            </Space>

                        </Card>
                    )}
                    {/* 曲轨 */}
                    {/* 水平部分的数据概览 - 只在水平完成时显示 */}
                    {false && currentStep == 1 && isHorizontalComplete && (
                        <Card
                            title="水平 - 数据概览"
                            style={{ marginBottom: 16, borderRadius: 8 }}
                            headStyle={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                backgroundColor: isEditing ? '#fffbe6' : '#e6f7ff',
                                padding: '12px 24px'
                            }}
                            className="overview-card"
                        >
                            <Descriptions
                                bordered
                                size="small"
                                column={{
                                    xs: 3,
                                    sm: 6,
                                    md: 8,
                                    lg: 8,
                                    xl: 16,
                                    xxl: 16,
                                }}
                                className="filled-fields-description"
                                layout='vertical'
                            >
                                {curvedHorizontalColumnTypes
                                    .filter(col => !col.hidden)
                                    .map(col => {
                                        const errors = getColumnErrors(col.name, curvedHorizontalErrors);
                                        const hasError = errors.length > 0;

                                        return (
                                            <Descriptions.Item
                                                key={`horizontal-${col.name}`}
                                                label={col.label}
                                                className={hasError ? 'error-column' : ''}
                                            >
                                                <Flex justify={'space-around'} wrap gap="small">
                                                    {!isEditing && (
                                                        <span>{curvedRailFormData.horizontal[col.name] || ''}</span>
                                                    )}
                                                    {isEditing && (
                                                        <Input
                                                            size="small"
                                                            value={curvedRailFormData.horizontal[col.name] || ''}
                                                            onChange={(e) => {
                                                                setCurvedRailFormData(prev => ({
                                                                    ...prev,
                                                                    horizontal: {
                                                                        ...prev.horizontal,
                                                                        [col.name]: e.target.value,
                                                                    }
                                                                }));
                                                                onEditChange();
                                                                queueFieldValidation('curvedHorizontal', col.name);
                                                            }}
                                                            style={{ maxWidth: 180 }}
                                                        />
                                                    )}

                                                    {hasError && (
                                                        <Tag color="error" style={{ marginLeft: 8 }}>
                                                            {errors.length} 个错误
                                                        </Tag>
                                                    )}
                                                </Flex>

                                                {hasError && (
                                                    <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                                                        {errors.map((error, idx) => (
                                                            <div key={idx} style={{ fontSize: 12 }}>
                                                                {error.message}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </Descriptions.Item>
                                        );
                                    })
                                }
                            </Descriptions>

                            {/* 行级别错误显示 */}
                            {getRowErrors(curvedHorizontalErrors).length > 0 && (
                                <Alert
                                    showIcon
                                    message="行级错误:"
                                    type="error"
                                    description={
                                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                                            {getRowErrors(curvedHorizontalErrors).map((error, idx) => (
                                                <li key={idx} style={{ marginBottom: 8, listStyle: 'disc' }}>
                                                    <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
                                                        {error.columnNames.map((n: string) => {
                                                            const found = curvedHorizontalColumnTypes.find(c => c.name === n);
                                                            return found ? found.label : n;
                                                        }).join(' + ')}:
                                                    </div>
                                                    <div style={{ fontSize: 14, marginTop: 4 }}>
                                                        {error.message}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                />

                            )}
                        </Card>
                    )}

                


                </Space>
            </PageContainer>
        </>
    );
}

export default NoFoundPage;