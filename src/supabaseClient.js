import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://eugdravtvewpnwkkpkzl.supabase.co",
  "sb_publishable_n2xhgXcQ1K2cEnk8g_JXsA_UKKBLhUH"
);

window.supabaseClient = supabase; 
console.log("Supabase initialised:", supabase);

export async function handleAddEquipmentSupabase(payload, dataBaseName){
  const { error } = await supabase
    .from(dataBaseName)
    .insert(payload)
    .select()

  if(error) {
    console.error('Error appending database: ', error);
  }
}

export async function getSupabaseLocationID(locationName) {
  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .eq('name', locationName)
    .single();

    if(error){
      console.error('Error fetching data: ', error);
      return null; 

    } else {
      console.log('Location ID type: ', typeof data.id);
      //console.log('Location ID. first element: ', data[0])
      console.log('Location ID. id: ', data.id);
      //console.log('Location ID: ', data)

      return data.id;
    }
}
