import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const green = "#12634F";
const dark = "#0A4C3C";
const orange = "#E66D32";

const cityTrips = [
  { route: "Route 101", operator: "Sheger City Bus", time: "08:10", arrival: "08:42", fare: "12", seats: "9 seats" },
  { route: "Route 74", operator: "Anbessa City Bus", time: "08:25", arrival: "09:02", fare: "10", seats: "14 seats" },
];
const longTrips = [
  { route: "Addis → Bahir Dar", operator: "Selam Bus", time: "06:30", arrival: "15:10", fare: "980", seats: "11 seats" },
  { route: "Addis → Bahir Dar", operator: "Sky Bus Ethiopia", time: "07:15", arrival: "16:05", fare: "895", seats: "18 seats" },
];

export default function HomeScreen() {
  const [service, setService] = useState<"city" | "long">("city");
  const [selected, setSelected] = useState<string | null>(null);
  const [remoteTrips, setRemoteTrips] = useState<typeof cityTrips | null>(null);
  const trips = remoteTrips ?? (service === "city" ? cityTrips : longTrips);
  const from = service === "city" ? "Megenagna" : "Addis Ababa Terminal";
  const to = service === "city" ? "Mexico Square" : "Bahir Dar";

  useEffect(() => {
    const api = process.env.EXPO_PUBLIC_API_URL;
    setRemoteTrips(null);
    if (!api) return;
    fetch(`${api}/api/v1/trips`).then((response) => response.ok ? response.json() : []).then((items: unknown[]) => {
      const next = items.map((item: any) => ({
        route: item.route?.service_type === "city" ? `Route ${item.route?.public_code ?? ""}` : `${item.route?.origin?.name ?? "Addis"} → ${item.route?.destination?.name ?? ""}`,
        operator: item.route?.operator_name ?? "Partner operator",
        time: new Date(item.departure_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        arrival: new Date(item.arrival_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        fare: String(item.fare_etb ?? 0), seats: `${item.capacity ?? 0} seats`, service: item.route?.service_type,
      })).filter((trip: any) => trip.service === (service === "city" ? "city" : "intercity"));
      if (next.length) setRemoteTrips(next);
    }).catch(() => undefined);
  }, [service]);

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={[dark, green, "#16805F"]} style={styles.hero}>
      <View style={styles.top}><View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandLetter}>A</Text></View><Text style={styles.brandName}>AddisGo</Text></View><Pressable style={styles.language}><Text style={styles.languageText}>አማ</Text></Pressable></View>
      <Text style={styles.kicker}>ETHIOPIA'S BUS TRAVEL COMPANION</Text>
      <Text style={styles.title}>Your journey,{"\n"}in your pocket.</Text>
      <Text style={styles.subtitle}>Find city buses and reserve long-distance travel with confidence.</Text>
      <View style={styles.liveCard}><View><Text style={styles.liveNumber}>17</Text><Text style={styles.liveLabel}>buses nearby</Text></View><View style={styles.routeLine}><View style={styles.routeDot}/><View style={styles.routeStroke}/><Text style={styles.bus}>🚌</Text></View><View><Text style={styles.liveNumber}>3 min</Text><Text style={styles.liveLabel}>next departure</Text></View></View>
    </LinearGradient>

    <View style={styles.searchCard}>
      <View style={styles.segment}><Pressable onPress={() => setService("city")} style={[styles.segmentButton, service === "city" && styles.segmentActive]}><Text style={[styles.segmentText, service === "city" && styles.segmentTextActive]}>City bus</Text></Pressable><Pressable onPress={() => setService("long")} style={[styles.segmentButton, service === "long" && styles.segmentActive]}><Text style={[styles.segmentText, service === "long" && styles.segmentTextActive]}>Long distance</Text></Pressable></View>
      <View style={styles.field}><Text style={styles.fieldLabel}>FROM</Text><Text style={styles.fieldValue}>●  {from}</Text></View>
      <View style={styles.field}><Text style={styles.fieldLabel}>TO</Text><Text style={styles.fieldValue}>◆  {to}</Text></View>
      <Pressable style={styles.searchButton}><Text style={styles.searchText}>Search routes</Text></Pressable>
    </View>

    <View style={styles.sectionHead}><View><Text style={styles.eyebrow}>FEATURED ROUTES</Text><Text style={styles.heading}>{service === "city" ? "Move across Addis" : "Go beyond Addis"}</Text></View><Text style={styles.today}>Today</Text></View>
    {trips.map((trip) => <Pressable key={trip.operator} onPress={() => setSelected(trip.operator)} style={[styles.trip, selected === trip.operator && styles.tripSelected]}><View style={styles.tripTop}><View><Text style={styles.routeBadge}>{trip.route}</Text><Text style={styles.operator}>{trip.operator}</Text></View><Text style={styles.fare}>ETB {trip.fare}</Text></View><View style={styles.times}><View><Text style={styles.time}>{trip.time}</Text><Text style={styles.stop}>{from}</Text></View><View style={styles.mid}><Text style={styles.duration}>{service === "city" ? "Direct · 32 min" : "Direct · 8h 40m"}</Text><View style={styles.dash}/></View><View style={{ alignItems: "flex-end" }}><Text style={styles.time}>{trip.arrival}</Text><Text style={styles.stop}>{to}</Text></View></View><View style={styles.tripBottom}><Text style={styles.seats}>{trip.seats} left</Text><Text style={styles.select}>{selected === trip.operator ? "Selected ✓" : "Choose →"}</Text></View></Pressable>)}
    <View style={styles.help}><Text style={styles.helpTitle}>Travel with less uncertainty.</Text><Text style={styles.helpText}>Clear fares, friendly local operators, and your ticket in one simple app.</Text></View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F7F7F1"},page:{paddingBottom:36},hero:{paddingHorizontal:22,paddingTop:12,paddingBottom:62,borderBottomLeftRadius:30,borderBottomRightRadius:30},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},brand:{flexDirection:"row",alignItems:"center",gap:9},brandMark:{height:36,width:36,borderRadius:11,backgroundColor:"#F1BD3D",alignItems:"center",justifyContent:"center"},brandLetter:{fontWeight:"900",fontSize:20,color:dark},brandName:{color:"white",fontWeight:"800",fontSize:21},language:{borderWidth:1,borderColor:"rgba(255,255,255,.35)",borderRadius:9,paddingHorizontal:10,paddingVertical:6},languageText:{color:"white",fontWeight:"800"},kicker:{color:"#DDF0E3",fontSize:10,fontWeight:"800",letterSpacing:1.15,marginTop:38},title:{color:"white",fontSize:38,lineHeight:42,fontWeight:"900",letterSpacing:-1,marginTop:10},subtitle:{color:"#DDF0E3",fontSize:15,lineHeight:22,marginTop:12,maxWidth:300},liveCard:{marginTop:28,backgroundColor:"rgba(255,255,255,.12)",borderColor:"rgba(255,255,255,.18)",borderWidth:1,borderRadius:18,padding:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},liveNumber:{color:"white",fontSize:20,fontWeight:"900"},liveLabel:{color:"#DDF0E3",fontSize:11,marginTop:2},routeLine:{flexDirection:"row",alignItems:"center",width:108},routeDot:{height:9,width:9,borderRadius:9,backgroundColor:"#F1BD3D"},routeStroke:{height:2,backgroundColor:"#F1BD3D",flex:1,marginHorizontal:5},bus:{fontSize:20},searchCard:{backgroundColor:"white",marginHorizontal:16,marginTop:-38,borderRadius:22,padding:14,shadowColor:"#0A4C3C",shadowOpacity:.16,shadowRadius:20,elevation:7},segment:{backgroundColor:"#EDF4E9",padding:4,borderRadius:12,flexDirection:"row",marginBottom:12},segmentButton:{flex:1,paddingVertical:10,borderRadius:9,alignItems:"center"},segmentActive:{backgroundColor:green},segmentText:{color:dark,fontWeight:"800",fontSize:13},segmentTextActive:{color:"white"},field:{borderWidth:1,borderColor:"#DCE3D9",backgroundColor:"#FFFDF6",borderRadius:13,padding:12,marginTop:8},fieldLabel:{fontSize:9,color:"#62746E",fontWeight:"800",letterSpacing:1},fieldValue:{color:"#102A24",fontSize:15,fontWeight:"800",marginTop:3},searchButton:{backgroundColor:orange,borderRadius:13,alignItems:"center",padding:14,marginTop:12},searchText:{color:"white",fontWeight:"900",fontSize:15},sectionHead:{paddingHorizontal:20,marginTop:30,marginBottom:12,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between"},eyebrow:{fontSize:10,color:orange,fontWeight:"900",letterSpacing:1.1},heading:{fontSize:25,color:"#102A24",fontWeight:"900",letterSpacing:-.5,marginTop:4},today:{fontSize:12,color:green,fontWeight:"800"},trip:{marginHorizontal:16,marginBottom:12,borderWidth:1,borderColor:"#DCE3D9",borderRadius:19,backgroundColor:"white",padding:16},tripSelected:{borderColor:green,borderWidth:2},tripTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start"},routeBadge:{alignSelf:"flex-start",backgroundColor:"#EAF5EF",color:green,paddingHorizontal:8,paddingVertical:4,borderRadius:6,fontSize:11,fontWeight:"900",overflow:"hidden"},operator:{color:"#62746E",fontSize:12,fontWeight:"700",marginTop:8},fare:{color:dark,fontSize:18,fontWeight:"900"},times:{flexDirection:"row",alignItems:"center",marginTop:18},time:{fontSize:21,fontWeight:"900",color:"#102A24"},stop:{fontSize:10,color:"#62746E",marginTop:3,maxWidth:90},mid:{flex:1,alignItems:"center",paddingHorizontal:10},duration:{fontSize:10,color:"#62746E",marginBottom:5},dash:{borderTopWidth:1,borderStyle:"dashed",borderColor:green,width:"100%"},tripBottom:{borderTopWidth:1,borderTopColor:"#EDF0EC",marginTop:15,paddingTop:12,flexDirection:"row",justifyContent:"space-between"},seats:{color:orange,fontSize:12,fontWeight:"800"},select:{color:green,fontSize:12,fontWeight:"900"},help:{marginHorizontal:16,marginTop:12,borderRadius:20,padding:20,backgroundColor:dark},helpTitle:{color:"white",fontSize:20,fontWeight:"900"},helpText:{color:"#CDE7D7",fontSize:13,lineHeight:19,marginTop:7}
});
