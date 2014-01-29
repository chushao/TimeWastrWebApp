class CreateSources < ActiveRecord::Migration
  def up
    create_table :sources, { :id => false}  do |t|
      t.primary_key :sourceID
      t.text :name
    end
  end

  def down
    drop_table :sources
  end

  #Will need to change this to def change later so ti won't drop db each time
end
