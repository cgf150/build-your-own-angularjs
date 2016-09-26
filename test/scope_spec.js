/* jshint globalstrict: true */
/* global Scope: false */
'use strict';
describe('Scope', function() {
    it('1.可以作为一个对象被构造和使用', function() {
        var scope = new Scope();
        scope.aProperty = 1;

        expect(scope.aProperty).toBe(1);
    });


    describe('$digest', function() {
        var scope;
        beforeEach(function() {
            scope = new Scope();
        });

        it('2.watch第一次$digest时调用监听函数', function() {
            var watchFn = jasmine.createSpy();
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('3.把scope当做参数调用watch函数', function() {
            var watchFn = jasmine.createSpy();
            var listenerFn = function() {

            };
            scope.$watch(watchFn, listenerFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('4.当值发生变化时调用listenerFn', function() {
            scope.someValue = 'a';
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.someValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
                console.log(scope.counter);
            });

            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);

            // scope.someValue的值未改变，所以调用$digest()没什么卵用
            scope.$digest();
            expect(scope.counter).toBe(1);

            // scope.someValue变了，调用$digets()后会执行listenerFn
            scope.someValue = 'b';
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('5.初次值为undefined', function() {
            scope.someValue = undefined;
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.someValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('6.缺省listener的watcher', function() {
            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        });

        it('7.当前digest中修改了scope的其他属性值，即watch中修改了另外一个watch的值', function() {
            scope.name = 'zhaoke';

            // 注意这里的注入watchers的顺序，颠倒则会导致这个case通过
            // 实际上不应该依赖顺序，所以需要去调整代码支持
            scope.$watch(function(scope) {
                return scope.nameUpper;
            }, function(newValue, oldValue, scope) {
                if (newValue) {
                    scope.initial = newValue.substring(0, 1) + '.';
                }
            });

            scope.$watch(function(scope) {
                return scope.name;
            }, function(newValue, oldValue, scope) {
                if (newValue) {
                    scope.nameUpper = newValue.toUpperCase();
                }
            });

            scope.$digest();
            expect(scope.initial).toBe('Z.');
        });

        it('8.10次迭代后放弃监听', function() {
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(function(scope) {
                return scope.counterA;
            }, function(newValue, oldValue, scope) {
                scope.counterB++;
            });

            scope.$watch(function(scope) {
                return scope.counterB;
            }, function(newValue, oldValue, scope) {
                scope.counterA++;
            });

            expect(function() {
                scope.$digest();
            }).toThrow();
        });

        it('9.最后一个watch是干净的时候则终止digest', function() {
            var watchExecutions = 0; // watch执行次数
            scope.array = _.range(10);

            // 创建10个watch
            _.times(10, function(i) {
                scope.$watch(function(scope) {
                    watchExecutions++;
                    return scope.array[i];
                }, function(newValue, oldValue, scope) {

                });
            });

            // 初次执行digest，执行2次脏值检查
            scope.$digest();
            expect(watchExecutions).toBe(20);

            // 修改所有watchers中的一个，
            // 希望尽量减少watch次数，检测到最后一个watch是干净的则停止digest
            scope.array[0] = 4;
            scope.$digest();
            expect(watchExecutions).toBe(31);

        });

        it('10.不结束digest，因此新的watch都不执行', function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {

                // 现在这个是不会执行的，原因是外层watch的listener是在执行$digest()后才执行
                // 而执行listener调用了$watch，但是没有执行$digest()
                scope.$watch(function(scope) {
                    return scope.aValue;
                }, function(newValue, oldValue, scope) {
                    scope.counter++;
                });
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('11.监听value的改变，而不仅仅是引用', function() {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            }, true);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.push(4); // watch.last是对aValue的地址引用，会同时修改成[1,2,3,4]，所以监听不到变化
            scope.$digest();

            // 目前watch对于object和array的引用都是地址引用，不是值，所以这里counter还是1
            expect(scope.counter).toBe(2);
            // expect(scope.counter2).toBe(2);
        });

        it('12.处理NaN', function() {
            scope.aValue = 0 / 0;
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('13.$eval用法', function() {
            scope.aValue = 42;
            var r = scope.$eval(function(scope) {
                return scope.aValue;
            });

            expect(r).toBe(42);

        });

        it('14.$eval第二个参数用法', function() {
            scope.aValue = 42;
            var r = scope.$eval(function(scope, arg) {
                return scope.aValue + arg;
            }, 2);

            expect(r).toBe(44);

        });

        it('15.$apply用法，内部调用$digest', function() {
            scope.a = 'someValue';
            scope.counter = 0;
            scope.$watch(function(scope) {
                return scope.a;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply(function() {
                scope.a = 'otherValue';
            });
            expect(scope.counter).toBe(2);
        });

        it('16.$evalAsync的用法，在同一周期中延后执行函数', function() {
            // 和$timeout的区别在于，$timeout把控制权交给了浏览器
            // $evalAsync可以更加严格的控制代码执行时间
            scope.a = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(function() {
                return scope.a;
            }, function(newValue, oldValue, scope) {
                scope.$evalAsync(function(scope) {
                    scope.asyncEvaluated = true;
                });
                scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
            });

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });

        it("17.watch中执行$evalAsync", function() {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;
            scope.$watch(function(scope) {
                    if (scope.asyncEvaluatedTimes < 2) {

                        scope.$evalAsync(function(scope) {
                            scope.asyncEvaluatedTimes++;
                        });
                    }
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {});
            scope.$digest();
            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it("18.终止通过watch添加$evalAsyncs", function() {
            scope.aValue = [1, 2, 3];
            scope.$watch(function(scope) {
                    //这会导致digest()中的while一直执行
                    scope.$evalAsync(function(scope) {});
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {});
            expect(function() { scope.$digest(); }).toThrow();
        });

        it("19.$$phase的值为当前执行digest的时期", function() {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(function(scope) {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );

            scope.$apply(function(scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });
            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });

        it('20.$evalAsync中来一个digest', function(done) {
            scope.aValue = "abc";
            scope.counter = 0;
            scope.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                });

            // $evalAsync中需要一个digest
            scope.$evalAsync(function(scope) {});
            expect(scope.counter).toBe(0);

            // 延时需比$evalAsync中的大，使digest正常执行
            setTimeout(function() {
                expect(scope.counter).toBe(1);
                done();
            }, 1);
        });

        it('21.每次digest后执行$$postDigest函数', function() {
            scope.counter = 0;
            scope.$$postDigest(function() {
                scope.counter++;
            });

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            // $$postDigest队列已经执行过，$$postDigestQueue为空，所以不会再次执行
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('22.digest中不包含$postDigest', function() {
            scope.a = 'a';

            scope.$$postDigest(function() {
                scope.a = 'b';
                console.log('post:', scope.a);

            });

            scope.$watch(function(scope) {
                return scope.a;
            }, function(newValue, oldValue, scope) {
                console.log('watch:', scope.a);
                scope.watchVal = newValue;
            });

            scope.$digest();
            expect(scope.watchVal).toBe('a');

            scope.$digest();
            expect(scope.watchVal).toBe('b');

        });

        it("23.销毁$watch", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            var destroyWatch = scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

    });
});
