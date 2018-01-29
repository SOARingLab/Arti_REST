'use strict';

angular.module('artirestApp')
    .controller('ProcessModelDetailController2', function ($scope, $rootScope, $cookies, $state, $stateParams, $timeout, $http, $uibModal, entity, ProcessModel,ArtifactModel,StatisticModelsService,Process) {
        $scope.processModel = entity;
        $scope.instances = {};
        $scope.statisticModels = {};
        $scope.operators = [">",">=","=","<=","<"];
        // console.log(window.navigator.cookieEnabled); //浏览器接受Cookie
        var cnt = 0;




        $scope.onload = function () {
            // var cookies = $cookies.getObject("processModel");
            // console.log(cookies);
            // $scope.processModel.artifacts = cookies;
            // console.log($scope.processModel);
            // console.log($scope.processModel.artifacts);
        }

        $scope.express_save = function (attr) {
            console.log(attr);
            console.log($scope.operators[attr.name]);
            if(attr.type != "Double"){
                $scope.operators[attr.name] = "=";
            }
            if(cnt == 0){
                $scope.exp = attr.name + $scope.operators[attr.name] + attr.value;
            }
            else {
                $scope.exp += "  and  " + attr.name + $scope.operators[attr.name] + attr.value;
            }
            cnt++;

            console.log($scope.exp);
        };

        $scope.findInstanceByCondition = function () {
            var ans = [];
            var id = 0;
            // console.log($scope.processModel);
            // var processModels = JSON.stringify($scope.processModel);
            // console.log(processModels);
            // console.log($cookies.getAll());
            // $cookies.putObject("processModel", $scope.processModel.artifacts);
            // console.log($cookies.getObject("processModel"));
            // // console.log("哈哈哈哈", document.cookie);


            console.log($scope.processModel.artifacts[0].attributes);
            for(var artifact in $scope.processModel.artifacts){
                var attributes = $scope.processModel.artifacts[artifact].attributes;
                for(var attr in attributes){
                    console.log(attributes[attr].name);
                    ans[id] = { "name":attributes[attr].name, "type":attributes[attr].type, "value":attributes[attr].value,
                                "operator": $scope.operators[attributes[attr].name] };

                    // ans[id].type = attr.type;
                    // ans[id].value = attr.value;
                    // ans[id].operator = operators[attr.name];
                    id++;
                }
            }
            $http({
                method: "POST",
                url: "/api/processModels/"+$scope.processModel.id+"/processes_query",
                headers:{
                    "Content-Type": "application/json; charset=utf-8"
                },
                data: JSON.stringify(ans),

            }).then(function(result){
                    $scope.instancesByCondition = result.data;
                    console.log(result.data);
                    $scope.instances_query = result.data;
                }, function(res){

                });
        };

        $scope.statisticModels = StatisticModelsService.findAll();
        $scope.statisticModels.$promise.then(function(data){
            var statisticModel = data[0];
            // console.log("processModelId: " + $stateParams.id);
            var processModelId = $stateParams.id;
            var stateNumberOfModels = statisticModel.stateNumberOfModels;
            $scope.stateNumberOfModel = stateNumberOfModels[processModelId];
        });

        $scope.load = function (id) {
            ProcessModel.get({id: id}, function(result) {
                $scope.processModel = result; //作用域仅在此函数
                var artifactModel = $scope.processModel.artifacts[0];
                console.log(artifactModel);
                //$timeout($scope.showStatesFlowcharts(), 1000);
                setTimeout(function(){
                    $scope.showStatesFlowcharts();
                }, 10);

                $scope.loadInstances(); //从后台加载实例
            });

        };

        $scope.load($stateParams.id);



        $scope.parseLifeCycle = function(artifact){
            var key = 'myDiagram-'+artifact.id;
            var json = eval('('+myDiagrams[key].model.toJson() + ')');
            console.log(json);
            var states = [];
            var stateKeyMap = {};
            for(var i=0;i<json.nodeDataArray.length;i++){
                var n = json.nodeDataArray[i];
                var state = {
                    name: n.text,
                    type: n.category ? (n.category == 'Start' ? 'START' : 'FINAL') : 'NORMAL',
                    comment: n.text,
                    nextStates: []
                };
                states.push(state);
                stateKeyMap[n.key] = i;
            }

            for(var i=0;i<json.linkDataArray.length;i++){
                var link = json.linkDataArray[i];
                states[stateKeyMap[link.from]].nextStates.push(states[stateKeyMap[link.to]].name);
            }
            return states;
        };

        $scope.saveEditArtifact = function(artifact){
            artifact.states = $scope.parseLifeCycle(artifact);
            $scope.saveArtifact(artifact);
        };

        $scope.loadInstances = function(){
            $http.get('/api/processModels/'+$scope.processModel.id+'/processes')
                .then(function(res){
                    $scope.instances = res.data;
                }, function(res){

                });
        };

        // $scope.instances.$promise.then(function(data) {
        //     console.log("instances : " + $scope.instances);
        //     for (var process in $scope.instances) {
        //         console.log("processName: ")
        //         console.log(process.name);
        //         for (var artifact in process.artifacts) {
        //             console.log("name = " + artifact.name);
        //             if (artifact.currentState == null) {
        //                 artifact.currentState = "NULL";
        //             }
        //         }
        //     }
        // });

        $scope.attrTypes = ['String','Long','Integer',"Double",'Float','Text','Date'];

        $scope.saveArtifact = function(artifact){
            console.log(artifact);
            ArtifactModel.update(artifact, function(res){

            }, function(res){});
        };

        $scope.newAttr = {name: null, type: null, comment: null};
        $scope.addAttr = function(artifact){
            if($scope.newAttr.name && $scope.newAttr.type && $scope.newAttr.comment){
                artifact.attributes.push($scope.newAttr);
               // $scope.saveArtifact(artifact);
                $scope.newAttr = {name: null, type: null, comment: null};
            }
        };


        $scope.removeAttr = function(artifact, attr){
            var idx =artifact.attributes.indexOf(attr);
            if(idx!=-1){
                artifact.attributes.splice(idx,1); //splice() 方法可删除从 index 处开始的零个或多个元素
                //$scope.saveArtifact(artifact);
            }
        };

        $scope.toggleEditAttr = function(artifact, attr){
            var idx = artifact.attributes.indexOf(attr);
            if(idx==-1) return;
            var key = '#artifact-'+artifact.id + ' tr.artifact-attr';
            var attrRow = $(key)[idx];
        };


        //必要的
        var unsubscribe = $rootScope.$on('artirestApp:processModelUpdate', function(event, result) {
            $scope.processModel = result;
        });

        $scope.$on('$destroy', unsubscribe);
        $scope.key = 0;

        $scope.addNode = function(nodes, edges, states, state, x, y, fromKey){ //递归函数
            var num = $scope.stateNumberOfModel.statenumber[state["name"]];
            var node = {
                "key" : $scope.key++,
                "text" : state["comment"] + "(" + num + ")",
                "loc" : "" + (x + 130) + " " + y
            };

            if(state["type"] == 'START')
                node["category"] = "Start";
            else if(state["type"] == 'FINAL')
                node["category"] = "End";

            nodes.push(node);


            if(state["type"] != "START"){
                edges.push({
                               "from" : fromKey,
                               "to" : node.key,
                               "fromPort" : x < 100 && state["type"] != "START" ? "B" : "R",
                               "toPort" : "L",
                               "text": 'r1'
                           });
            }

            var maxWidth = $(".artifact-list").width();

            var fromKey = $scope.key - 1;
            for (var i = 0; i < state.nextStates.length; i++) {　//找出该状态的下一个状态(可能是0或者多个)，需通过遍历找出对应的state数组
                for(var j=0;j<states.length;j++){
                    if(states[j]["name"] == state.nextStates[i]){
                        if(x+280>maxWidth)
                            $scope.addNode(nodes, edges, states, states[j], 20, y + 100 * i + 100, fromKey);
                        else
                            $scope.addNode(nodes, edges, states, states[j], x + 170, y + 100 * i, fromKey);

                    }
                }
            }
        };

        $scope.showStatesFlowcharts = function(){
            $scope.artifacts = $scope.processModel.artifacts;
            for (var i = 0; i < $scope.artifacts.length; i++) {
                var artifact = $scope.artifacts[i];
                var start;
                var states = artifact.states;

                //找到初始状态
                for (var j = 0; j < states.length; j++) {
                    var state = states[j];
                    if(state["type"] == 'START'){
                        start = state;
                    }
                };

                var nodes = [];
                var edges = [];

                //找到了，开始放置图形的位置
                if(start)
                    $scope.addNode(nodes, edges, states, start, 0, 200, 0);

                var json = {
                    "class": "go.GraphLinksModel",
                    "linkFromPortIdProperty": "fromPort",
                    "linkToPortIdProperty": "toPort",
                    "nodeDataArray": nodes,
                    "linkDataArray": edges
                };

                console.log(json);

                if (json.nodeDataArray.length < 8) {
                    $("#myDiagram-"+artifact.id).css("height", "400px");
                };

                initFlowchart("myDiagram-"+artifact.id);
                loadFlowchartFromJson("myDiagram-"+artifact.id, json);
            };
        };


    });
