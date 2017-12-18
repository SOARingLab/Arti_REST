package com.raysmond.artirest.service;

import com.codahale.metrics.Gauge;
import com.codahale.metrics.Meter;
import com.codahale.metrics.MetricFilter;
import com.codahale.metrics.MetricRegistry;
import com.codahale.metrics.graphite.Graphite;
import com.codahale.metrics.graphite.GraphiteReporter;
import com.raysmond.artirest.MetricImp.GaugeImp;
import com.raysmond.artirest.MetricImp.ProcessModelNumberImp;
import com.raysmond.artirest.domain.Process;
import com.raysmond.artirest.domain.ProcessModel;
import com.raysmond.artirest.repository.ProcessModelRepository;
import com.raysmond.artirest.repository.ProcessRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import springfox.documentation.RequestHandler;

import javax.annotation.PostConstruct;
import java.net.InetSocketAddress;
import java.rmi.registry.Registry;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static com.codahale.metrics.MetricRegistry.name;
import static com.codahale.metrics.graphite.GraphiteReporter.*;

@Service
public class InitialService {

    @Autowired
    ProcessRepository processRepository;

    @Autowired
    ProcessModelRepository processModelRepository;

    @Autowired
    MetricRegistry registry;

    public static Map<String,Integer> processNumberofModel = new LinkedHashMap<>();

    @PostConstruct
    public void initialmonitor(){
        Graphite graphite = new Graphite(new InetSocketAddress("10.141.209.192",2003));

        registry.register(name(InitialService.class,"ProcessModelNumberImp")
                        , new Gauge<Integer>(){
                @Override
                public Integer getValue(){
                    return processModelRepository.findAll().size();
                }
            });
        //System.out.println(number); //2

        List<ProcessModel> processModels = processModelRepository.findAll();
        List<Process> processes = processRepository.findAll();


        for (ProcessModel processModel : processModels) {
            processNumberofModel.put(processModel.getId(),0);
        }

        for(Process process : processes) {
            if(process.getProcessModel() != null){
                String name = process.getProcessModel().getId();
                processNumberofModel.put(name,processNumberofModel.get(name)+1);
            }
        }

        for(ProcessModel processModel : processModels){
            String name = processModel.getId();
            registry.register(name,new Gauge<Integer>(){
                    @Override
                    public Integer getValue(){
                        System.out.println(processNumberofModel.get(name));
                        return processNumberofModel.get(name);
                    }
            });
        }

		GraphiteReporter reporter = forRegistry(registry)
				.prefixedWith("ArtiREST.ProcessModel")
				.convertRatesTo(TimeUnit.SECONDS)
				.convertDurationsTo(TimeUnit.MILLISECONDS)
				.filter(MetricFilter.ALL)
				.build(graphite);
		// 设置每隔5秒钟，向Graphite中发送一次指标值
		reporter.start(1, TimeUnit.SECONDS);
    }

}